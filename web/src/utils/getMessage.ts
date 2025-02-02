const messages = new Map<string, {}>();
const roomKeys = new Map<string, {}>();
async function getMessage(messageid: string): Promise<string> {
  const encryptedMessageRes = await fetch(`https://${messageid.split("@")[1]}/_takos/v2/message?messageId=${messageid}`)
    if (encryptedMessageRes.status !== 200) {
        return "Unauthorized"
    }
    const encryptedMessage = await encryptedMessageRes.json()
    
}



