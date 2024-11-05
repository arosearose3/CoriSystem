<script>
  import { currentLanguage, activeTranslations } from '$lib/i18n';
  $: currentTranslations = $activeTranslations;
  $: translateText = (key) => {
    return currentTranslations[key] || key;
  };

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
    let highlights_es = [
    {
      title: "Sistema de Gestión de Referencias",
      text: "Cori es un sistema de información de referencias diseñado para mejorar la coordinación de la atención y la conectividad de datos entre los proveedores de servicios de salud mental y servicios sociales de Medicaid. Integra estándares estatales y nacionales (HL7 FHIR SDOH Clinical Care 2.2.0) para mejorar la atención al paciente."
    },
    {
      title: "Audiencia Objetivo",
      text: "Cori atiende a proveedores de necesidades sociales relacionadas con la salud y a proveedores de salud mental de Medicaid en solitario, pequeños e independientes en Colorado. Cori se enfoca en reducir las barreras para la atención, abordar los determinantes sociales de la salud y mejorar el acceso para las poblaciones desatendidas."
    },
    {
      title: "Objetivos de Cori",
      text: "Cori tiene como objetivo desmantelar los silos de datos, conectar a los proveedores con información crítica, mejorar la coordinación de la atención al paciente y promover la salud integral al integrar la atención física, conductual y social."
    },
    {
      title: "Características Principales",
      text: "Cori incluye características como la disponibilidad precisa de los proveedores, el intercambio seguro de datos conforme a HIPAA, notificaciones, controles de acceso basados en roles de mensajería y un robusto sistema de gestión de consentimientos para empoderar a pacientes y proveedores."
    },
    {
      title: "Pila Tecnológica",
      text: "Cori utiliza un backend de servidor Node.js Express y un frontend de componentes modulares Svelte en un servidor conforme a HIPAA. Se integra completamente con Google FHIR Store para el almacenamiento de datos, sin depender de bases de datos locales. La autenticación se maneja a través de Google OAuth2."
    }
  ];
  
</script>

<section>
    <h3>{translateText('welcomeMessage')}</h3>
    {#if $currentLanguage === 'en'}
      {#each highlights as highlight}
        <div class="highlight">
          <h2>{highlight.title}</h2>
          <p>{highlight.text}</p>
        </div>
      {/each}
    {:else}
      {#each highlights_es as highlight}
        <div class="highlight">
          <h2>{highlight.title}</h2>
          <p>{highlight.text}</p>
        </div>
      {/each}
    {/if}
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
