async function handleConsentEmail(workflowInstance, emailDetails) {
    // Create a Task to track this consent request
    const task = await createFhirTask({
        basedOn: workflowInstance.id,  // Link to our workflow
        status: 'requested',
        intent: 'order'
    });

    // Generate secure tokens for our response endpoints
    const approveToken = generateSecureToken({
        taskId: task.id,
        response: 'approved'
    });
    
    const rejectToken = generateSecureToken({
        taskId: task.id,
        response: 'rejected'
    });

    // Create the response URLs
    const baseUrl = 'https://api.example.com/consent-response';
    const approveUrl = `${baseUrl}/${approveToken}`;
    const rejectUrl = `${baseUrl}/${rejectToken}`;

    // Register these tokens in our temporary endpoint system
    await registerTemporaryEndpoint(approveToken, {
        taskId: task.id,
        response: 'approved'
    });

    await registerTemporaryEndpoint(rejectToken, {
        taskId: task.id,
        response: 'rejected'
    });

    // Send the email with embedded URLs
    await sendEmail({
        to: emailDetails.recipient,
        subject: emailDetails.subject,
        template: 'consent-request',
        parameters: {
            approveUrl,
            rejectUrl,
            // Other email template parameters...
        }
    });

    // Return success with the Task ID for tracking
    return {
        taskId: task.id,
        status: 'sent'
    };
}

async function handleConsentResponse(token) {
    // Validate the token and get the stored information
    const endpointInfo = await validateAndGetEndpoint(token);
    if (!endpointInfo) {
        throw new Error('Invalid or expired consent response token');
    }

    // Update the Task with the response
    await updateFhirTask(endpointInfo.taskId, {
        status: 'completed',
        output: [{
            name: 'responseResult',
            value: endpointInfo.response
        }]
    });

    // The workflow engine will pick up this Task update
    // and continue with the appropriate next activity

    // Clean up our temporary endpoint
    await removeTemporaryEndpoint(token);

    // Show a nice "thank you" page to the user
    return {
        status: 'success',
        message: 'Thank you for your response'
    };
}

