import { google } from 'googleapis';

const healthcare = google.healthcare('v1');

async function manageStructureDefinition(auth) {
  const projectId = 'your-project-id';
  const location = 'your-location';
  const datasetId = 'your-dataset-id';
  const fhirStoreId = 'your-fhir-store-id';

  const parent = `projects/${projectId}/locations/${location}/datasets/${datasetId}/fhirStores/${fhirStoreId}`;
  const structureDefinitionUrl = "http://example.com/StructureDefinition/practitioner-capacity";

  try {
    // First, check if the StructureDefinition already exists
    const searchResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.search({
      parent: parent,
      resourceType: 'StructureDefinition',
      auth: auth,
      searchParams: {
        url: structureDefinitionUrl
      }
    });

    const searchResult = await handleBlobResponse(searchResponse.data);

    if (searchResult.entry && searchResult.entry.length > 0) {
      console.log('StructureDefinition already exists:', searchResult.entry[0].resource);
      return searchResult.entry[0].resource;
    }

    // If it doesn't exist, create a new one
    const structureDefinition = {
        "resourceType": "StructureDefinition",
        "url": "https://combinebh.org/resources/FHIRResources/PractitionerCapacityFHIRExtension.html",
        "name": "PractitionerCapacity",
        "status": "draft",
        "fhirVersion": "4.0.1",
        "kind": "complex-type",
        "abstract": false,
        "type": "Extension",
        "baseDefinition": "http://hl7.org/fhir/StructureDefinition/Extension",
        "context": [
          {
            "type": "element",
            "expression": "PractitionerRole"
          }
        ],
        "differential": {
          "element": [
            {
              "id": "Extension",
              "path": "Extension",
              "short": "Practitioner capacity for different patient types"
            },
            {
              "id": "Extension.extension:children",
              "path": "Extension.extension",
              "sliceName": "children",
              "min": 0,
              "max": "1",
              "type": [
                {
                  "code": "Extension"
                }
              ]
            },
            {
              "id": "Extension.extension:children.value[x]",
              "path": "Extension.extension.value[x]",
              "type": [
                {
                  "code": "integer"
                }
              ]
            },
            {
              "id": "Extension.extension:adults",
              "path": "Extension.extension",
              "sliceName": "adults",
              "min": 0,
              "max": "1",
              "type": [
                {
                  "code": "Extension"
                }
              ]
            },
            {
              "id": "Extension.extension:adults.value[x]",
              "path": "Extension.extension.value[x]",
              "type": [
                {
                  "code": "integer"
                }
              ]
            },
            {
              "id": "Extension.extension:teens",
              "path": "Extension.extension",
              "sliceName": "teens",
              "min": 0,
              "max": "1",
              "type": [
                {
                  "code": "Extension"
                }
              ]
            },
            {
              "id": "Extension.extension:teens.value[x]",
              "path": "Extension.extension.value[x]",
              "type": [
                {
                  "code": "integer"
                }
              ]
            },
            {
              "id": "Extension.extension:couples",
              "path": "Extension.extension",
              "sliceName": "couples",
              "min": 0,
              "max": "1",
              "type": [
                {
                  "code": "Extension"
                }
              ]
            },
            {
              "id": "Extension.extension:couples.value[x]",
              "path": "Extension.extension.value[x]",
              "type": [
                {
                  "code": "integer"
                }
              ]
            },
            {
              "id": "Extension.extension:families",
              "path": "Extension.extension",
              "sliceName": "families",
              "min": 0,
              "max": "1",
              "type": [
                {
                  "code": "Extension"
                }
              ]
            },
            {
              "id": "Extension.extension:families.value[x]",
              "path": "Extension.extension.value[x]",
              "type": [
                {
                  "code": "integer"
                }
              ]
            }
          ]
        }
      }

    const createResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.create({
      parent: parent,
      type: 'StructureDefinition',
      requestBody: structureDefinition,
      auth: auth
    });

    console.log('StructureDefinition created successfully:', createResponse.data);
    return createResponse.data;

  } catch (error) {
    console.error('Error managing StructureDefinition:', error);
    throw error;
  }
}



// Function to update PractitionerRole with capacity data
async function updatePractitionerRoleWithCapacity(auth, practitionerRoleId, capacityData) {
  const parent = `projects/${projectId}/locations/${location}/datasets/${datasetId}/fhirStores/${fhirStoreId}`;
  const name = `${parent}/fhir/PractitionerRole/${practitionerRoleId}`;

  try {
    // First, get the existing PractitionerRole
    const getResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: name,
      auth: auth
    });

    const practitionerRole = getResponse.data;

    // Add or update the extension
    if (!practitionerRole.extension) {
      practitionerRole.extension = [];
    }

    const capacityExtension = practitionerRole.extension.find(ext => 
      ext.url === "https://combinebh.org/resources/FHIRResources/PractitionerCapacityFHIRExtension.html"
    );

    if (capacityExtension) {
      capacityExtension.extension = capacityData;
    } else {
      practitionerRole.extension.push({
        url: "https://combinebh.org/resources/FHIRResources/PractitionerCapacityFHIRExtension.html",
        extension: capacityData
      });
    }

    // Update the PractitionerRole
    const updateResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.update({
      name: name,
      requestBody: practitionerRole,
      auth: auth
    });

    console.log('PractitionerRole updated successfully:', updateResponse.data);
    return updateResponse.data;
  } catch (error) {
    console.error('Error updating PractitionerRole:', error);
    throw error;
  }
}

// Example usage:
/* async function main() {
  try {
    const auth = await getAuthClient(); // Implement this function to get your auth client
    await manageStructureDefinition(auth);

    const capacityData = [
      { url: "children", valueInteger: 5 },
      { url: "adults", valueInteger: 10 },
      { url: "teens", valueInteger: 7 },
      { url: "couples", valueInteger: 3 },
      { url: "families", valueInteger: 2 }
    ];
    await updatePractitionerRoleWithCapacity(auth, 'practitionerRoleId', capacityData);
  } catch (error) {
    console.error('Error in main process:', error);
  }
} */

// main();