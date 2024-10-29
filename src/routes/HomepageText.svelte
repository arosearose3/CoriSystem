<script>
    let highlights = [
        {
            title: "Referral Management System",
            text: "Cori is a referral information system designed to enhance care coordination and data connectivity across Medicaid mental health and social services providers. It integrates state and national standards (HL7 FHIR SDOH Clinical Care 2.2.0) to improve patient care."
        },
        {
            title: "Target Audience",
            text: "Cori serves health related social needs providers and solo, small, and independent Medicaid mental health providers in Colorado. Cori focuses on reducing barriers to care, addressing social determinants of health, and improving access for underserved populations."
        },
        {
            title: "Goals of Cori",
            text: "Cori aims to break down data silos, connect providers to critical information, improve patient care coordination, and promote whole-person health by integrating physical, behavioral, and social care."
        },
        {
            title: "Core Features",
            text: "Cori includes features such as accurate provider availability, secure HIPAA-compliant data sharing, notification, messaging role-based access controls, and a robust consent management system to empower patients and providers."
        },
        {
            title: "Technology Stack",
            text: "Cori uses a Node.js Express server backend and a modular Svelte component frontend on a HIPAA compliant server. It fully integrates with Google FHIR Store for data storage, without relying on local databases. Authentication is handled via Google OAuth2."
        },
        {
            title: "Data and Interoperability",
            text: "Cori allows third parties to retrieve necessary health and referral data through FHIR endpoints, improving data accessibility. This ensures that the right care is provided at the right time by connecting multiple healthcare and social service systems."
        },
        {
            title: "For Providers and Public Health Professionals",
            text: "Providers use Cori to reduce administrative burdens and streamline referral processes, while public health professionals can track community health outcomes. Cori supports a holistic approach to healthcare, integrating physical, behavioral, and social health data."
        }
    ];
</script>

<section>
    <h3>Welcome to Cori: Colorado Referral Information</h3>
    {#each highlights as highlight}
        <div class="highlight">
            <h4>{highlight.title}</h4>
            <p>{highlight.text}</p>
        </div>
    {/each}
</section>

<style>
    section {
        padding: 2rem;
        background-color: #f9f9f9;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        max-width: 800px;
        margin: 2rem auto;
    }
    h3 {
        text-align: center;
        color: #333;
    }
    .highlight {
        margin-bottom: 2rem;
    }
    h4 {
        color: #007BFF;
    }
    p {
        color: #555;
    }
</style>
