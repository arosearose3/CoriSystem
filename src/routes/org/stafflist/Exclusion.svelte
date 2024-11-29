<script>
    import { onMount } from 'svelte';
    import { base } from '$app/paths';
    
    export let organizationId = null;

    let OIGUpdateDate = "not loaded";
    let SAMUpdateDate = "not loaded";
    let COUpdateDate = "not loaded";
    let staffRoster = [];
    let checking = false;
    let sortColumn = 'firstName';
    let sortDirection = 'asc';
    let orgEmail = "";

    // Function to generate HTML email content
    function generateEmailHTML() {
        const tableRows = staffRoster.map(staff => `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${staff.firstName}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${staff.lastName}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${staff.dob}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${staff.npi}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${staff.samMatch ? '❌' : '✅'}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${staff.oigMatch ? '❌' : '✅'}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${staff.coMatch ? '❌' : '✅'}</td>
            </tr>
        `).join('');

        return `
            <html>
                <head>
                    <style>
                        table {
                            border-collapse: collapse;
                            width: 100%;
                            margin-top: 20px;
                        }
                        th {
                            background-color: #f2f2f2;
                            border: 1px solid #ddd;
                            padding: 12px 8px;
                            text-align: left;
                        }
                        tr:nth-child(even) {
                            background-color: #f9f9f9;
                        }
                    </style>
                </head>
                <body>
                    <h2>Eligibility Check Results</h2>
                    <p>File Update Dates:</p>
                    <ul>
                        <li>OIG: ${OIGUpdateDate}</li>
                        <li>SAMHSA: ${SAMUpdateDate}</li>
                        <li>Colorado: ${COUpdateDate}</li>
                    </ul>
                    <table>
                        <thead>
                            <tr>
                                <th>First Name</th>
                                <th>Last Name</th>
                                <th>DOB</th>
                                <th>NPI</th>
                                <th>SAMHSA</th>
                                <th>OIG</th>
                                <th>Colorado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </body>
            </html>
        `;
    }

    // Function to fetch org email
    async function fetchOrgEmail(orgId) {
        try {
            const response = await fetch(`${base}/api/organization/getOrgEmail?reference=${orgId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch org email');
            }

            const emailData = await response.json();
            return emailData.email || null;
        } catch (error) {
            console.error('Error fetching org email:', error);
            return null;
        }
    }

    // Function to fetch metadata (file upload dates)
    async function fetchMetadata() {
        try {
            const response = await fetch(`${base}/api/exclusion/upload-dates`);
            if (!response.ok) throw new Error('Failed to fetch metadata');
            const data = await response.json();
            OIGUpdateDate = new Date(data.OIG).toLocaleString();
            SAMUpdateDate = new Date(data.SAMHSA).toLocaleString();
            COUpdateDate = new Date(data.Colorado).toLocaleString();
        } catch (error) {
            console.error('Error fetching metadata:', error);
        }
    }

    onMount(async () => {
        await fetchMetadata();
        const emailResult = await fetchOrgEmail(organizationId);
        orgEmail = emailResult || "No email available";
    });

    // Function to fetch practitioners
    async function fetchPractitioners() {
        if (!organizationId) return;
        try {
            const response = await fetch(`${base}/api/practitioner/getStaffForOrg?organizationId=${organizationId}`);
            if (!response.ok) throw new Error('Failed to fetch practitioners');
            const bundle = await response.json();

            if (bundle.resourceType === 'Bundle' && Array.isArray(bundle.entry)) {
                staffRoster = bundle.entry.map(entry => {
                    const practitioner = entry.resource;
                    const nameObj = practitioner.name?.[0];
                    const firstName = nameObj?.given?.join(' ') || 'Unknown';
                    const lastName = nameObj?.family || 'Unknown';
                    const npi = practitioner.identifier?.find(id => id.system === 'http://hl7.org/fhir/sid/us-npi')?.value || 'Unknown';
                    const dob = practitioner.birthDate || 'Unknown';

                    return {
                        firstName,
                        lastName,
                        npi,
                        dob,
                        samMatch: null,
                        oigMatch: null,
                        coMatch: null
                    };
                });
            }
        } catch (error) {
            console.error('Error fetching practitioners:', error);
            staffRoster = [];
        }
    }

    // Function to handle sorting
    function sortTable(column) {
        if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumn = column;
            sortDirection = 'asc';
        }

        staffRoster = staffRoster.sort((a, b) => {
            let aValue = a[column];
            let bValue = b[column];

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Function to check staff roster
    async function checkStaffRoster() {
        checking = true;
        await fetchPractitioners();
        
        const staffData = staffRoster.map(practitioner => [
            practitioner.firstName,
            practitioner.lastName,
            practitioner.dob,
            practitioner.npi
        ]);

        try {
            const response = await fetch(`${base}/api/exclusion/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ staffData })
            });
            if (!response.ok) throw new Error('Failed to check staff eligibility');

            const checkResults = await response.json();
            staffRoster = staffRoster.map((staff, index) => ({
                ...staff,
                samMatch: checkResults[index].samMatch,
                oigMatch: checkResults[index].oigMatch,
                coMatch: checkResults[index].coMatch,
            }));
        } catch (error) {
            console.error('Error checking staff eligibility:', error);
            staffRoster = [];
        } finally {
            checking = false;
        }
    }

    // Function to display result icons
    function displayResult(result) {
        return result ? '❌' : '✅';
    }

    // Function to email admin
    async function emailAdmin() {
        const subject = 'Eligibility Check Results';
        const htmlContent = generateEmailHTML();
        
        try {
            const response = await fetch(`${base}/api/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: orgEmail,
                    subject,
                    html: htmlContent
                })
            });
            
            if (!response.ok) throw new Error('Failed to send email');
            alert('Email sent successfully');
        } catch (error) {
            console.error('Error sending email:', error);
            alert('Failed to send email');
        }
    }
</script>


<div class="eligibility-check-container">
    <button on:click={fetchMetadata}>Refresh File Upload Dates</button>

    <div class="update-dates">
        <p><strong>US Office of Inspector General file updated on:</strong> {OIGUpdateDate}</p>
        <p><strong>SAMHSA file updated on:</strong> {SAMUpdateDate}</p>
        <p><strong>Colorado file updated on:</strong> {COUpdateDate}</p>
    </div>

    <button on:click={checkStaffRoster} disabled={checking}>
        {checking ? "Checking..." : "Check Staff Roster"}
    </button>

    {#if staffRoster.length > 0}
        <div class="table-container">
            <table class="staff-table">
                <thead>
                    <tr>
                        <th on:click={() => sortTable('firstName')}>
                            First Name {sortColumn === 'firstName' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th on:click={() => sortTable('lastName')}>
                            Last Name {sortColumn === 'lastName' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th on:click={() => sortTable('dob')}>
                            DOB {sortColumn === 'dob' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th on:click={() => sortTable('npi')}>
                            NPI {sortColumn === 'npi' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th on:click={() => sortTable('samMatch')}>
                            SAMHSA {sortColumn === 'samMatch' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th on:click={() => sortTable('oigMatch')}>
                            OIG {sortColumn === 'oigMatch' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th on:click={() => sortTable('coMatch')}>
                            Colorado {sortColumn === 'coMatch' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {#each staffRoster as staff}
                        <tr>
                            <td>{staff.firstName}</td>
                            <td>{staff.lastName}</td>
                            <td>{staff.dob}</td>
                            <td>{staff.npi}</td>
                            <td>{displayResult(staff.samMatch)}</td>
                            <td>{displayResult(staff.oigMatch)}</td>
                            <td>{displayResult(staff.coMatch)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>

            <button on:click={emailAdmin} class="email-button">
                Email Results to {orgEmail}
            </button>
        </div>
    {/if}
</div>

<style>
    .eligibility-check-container {
        padding: 20px;
        border: 1px solid #ccc;
        border-radius: 8px;
        max-width: 1000px;
        margin: 0 auto;
    }

    .update-dates {
        margin: 20px 0;
    }

    .table-container {
        margin-top: 20px;
        overflow-x: auto;
    }

    .staff-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
    }

    .staff-table th,
    .staff-table td {
        border: 1px solid #ccc;
        padding: 10px;
        text-align: left;
    }

    .staff-table th {
        background-color: #f5f5f5;
        cursor: pointer;
    }

    .staff-table th:hover {
        background-color: #e5e5e5;
    }

    .staff-table tr:nth-child(even) {
        background-color: #f9f9f9;
    }

    button {
        padding: 10px 20px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin: 5px;
    }

    button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }

    button:hover:not(:disabled) {
        background-color: #0056b3;
    }

    .email-button {
        margin-top: 20px;
        background-color: #28a745;
    }

    .email-button:hover {
        background-color: #218838;
    }
</style>