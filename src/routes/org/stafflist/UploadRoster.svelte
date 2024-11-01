<script>
    import { onMount } from 'svelte';
    import ProviderList from './ProviderList.svelte';
    import { practitionersHelper } from '$lib/practitionersStore.js';

    let selectedFile = null;
    let error = null;
    let fileInput;
    let uploadedData = null;

    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Accept both .csv and .txt files
        if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.txt')) {
            error = 'Please upload a CSV file';
            return;
        }

        try {
            const text = await file.text();
            const rows = text.split('\n')
                .map(row => row.trim())
                .filter(row => row.length > 0); // Remove empty rows

            // Process all rows including first row, assuming fixed column positions
            const providers = rows.map(row => {
                const values = row.split(',').map(v => v.trim());
                return {
                    firstName: values[0] || '',
                    lastName: values[1] || '',
                    dob: values[2] || '',
                    npi: values[3] || ''
                };
            });

            uploadedData = {
                name: file.name,
                data: providers
            };

            selectedFile = uploadedData;
        } catch (err) {
            console.error('Error processing CSV:', err);
            error = 'Error processing file. Please check the format.';
        }
    }

    function handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    async function handleDrop(event) {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event('change'));
        }
    }
</script>

<div class="container mx-auto p-4">
    {#if error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span class="block sm:inline">{error}</span>
        </div>
    {/if}

    {#if selectedFile}
        <div>
            <button 
                class="mb-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                on:click={() => selectedFile = null}
            >
                Back to Upload
            </button>
            <ProviderList selectedFile={selectedFile} on:error={(e) => error = e.detail} />
        </div>
    {:else}
        <div 
            class="bg-white shadow-md rounded-lg p-8"
            on:dragover={handleDragOver}
            on:drop={handleDrop}
        >
            <h2 class="text-xl font-bold mb-6">Upload Exclusion List Roster</h2>
            
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div class="mb-4">
                    <input
                        bind:this={fileInput}
                        type="file"
                        accept=".csv,.txt"
                        class="hidden"
                        on:change={handleFileUpload}
                    />
<!--                     <button
                        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        on:click={() => fileInput.click()}
                    >
                        Select File
                    </button> -->
                </div>
  <!--               <p class="text-gray-600">or drag and drop your file here</p> -->
                <p class="text-sm text-gray-500 mt-2">
                    Upload a CSV file with columns in this order:<br>
                    First Name, Last Name, Date of Birth, NPI, without a column header row.
                </p>
            </div>
        </div>
    {/if}
</div>