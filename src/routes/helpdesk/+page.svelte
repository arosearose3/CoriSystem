<script>
     import { onMount } from 'svelte';
     import { currentLanguage, activeTranslations } from '$lib/i18n';

        $: currentTranslations = $activeTranslations;
        $: translateText = (key) => {
        return currentTranslations[key] || key;
        };
        $: currentLang = $currentLanguage;



     onMount(() => {
        console.log ("in helpdesk");
    });

</script>

<h4>Nov 19, 2024</h4>

{#if currentLang === 'en'}
  <p>Email andy@combinebh.org for tech support</p>
  <p>If urgent text 303 532 6780</p>
{:else}
  <p>Correo electrónico andy@combinebh.org para soporte técnico</p>
  <p>Si es urgente, envíe un mensaje de texto al 303 532 6780</p>
{/if}