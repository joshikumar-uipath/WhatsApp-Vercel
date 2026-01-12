export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'MySuperSecureToken';

  if (req.method === 'GET') {
    // Verification handshake logic here
    res.status(200).send(req.query['hub.challenge'] || 'OK');
    return;
  }

  if (req.method === 'POST') {
    const body = req.body;
    console.log('Received webhook event:', JSON.stringify(body, null, 2));

    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (!value) {
      res.status(200).send('No value field');
      return;
    }

    const businessNumber = value.metadata?.display_phone_number;
    const messages = value.messages || [];

    // Filter only messages sent by external users
    const externalMessages = messages.filter(msg => msg.from !== businessNumber);

    if (externalMessages.length > 0) {
      const uiPathUrl = "https://staging.uipath.com/mea/defaulttenant/elements_/v1/webhooks/events/94992c6b-c688-4d43-9077-7ef65098c5ad";

      try {
        const forwardResponse = await fetch(uiPathUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ ...body, messages: externalMessages }) // forward only external messages
        });

        const forwardBody = await forwardResponse.text();
        console.log("Forwarded to UiPath, response:", forwardResponse.status, forwardBody);
      } catch (err) {
        console.error("Error forwarding to UiPath:", err);
      }
    } else {
      console.log("No external messages to forward.");
    }

    res.status(200).send('EVENT_RECEIVED');
    return;
  }

  res.status(405).send('Method Not Allowed');
}
