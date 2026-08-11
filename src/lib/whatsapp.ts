import "server-only";

/**
 * Sends a message to a WhatsApp group via CallMeBot's group webhook.
 * Requires the CallMeBot bot to already be added to the group and
 * authorized (see README for the one-time group setup steps).
 *
 * Never throws: a notification failure must not block the caller's
 * primary action (e.g. publishing results), so errors are logged only.
 */
export async function notifyWhatsAppGroup(text: string): Promise<void> {
  const groupId = process.env.CALLMEBOT_GROUP_ID;
  const apiKey = process.env.CALLMEBOT_APIKEY;

  if (!groupId || !apiKey) {
    console.warn("WhatsApp notification skipped: CALLMEBOT_GROUP_ID/CALLMEBOT_APIKEY not set.");
    return;
  }

  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("source", "group");
  url.searchParams.set("group_id", groupId);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("text", text);

  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      console.error(`WhatsApp notification failed: ${response.status} ${await response.text()}`);
    }
  } catch (error) {
    console.error("WhatsApp notification failed:", error);
  }
}
