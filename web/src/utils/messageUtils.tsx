export function convertLineBreak(message: string | null | undefined) {
  if (message === null || message === undefined) return;
  const messageValue = JSON.parse(message) as { text: string; format: string };
  if (messageValue.format === "text") {
    return messageValue.text.split("\n").map((line, index) => (
      <span>
        {line}
        <br />
      </span>
    ));
  }
  if (messageValue.format === "markdown") {
    return messageValue.text;
  }
}

export function convertTime(time: string | number | Date) {
  const date = new Date(time);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "午後" : "午前";
  const hour = hours % 12;
  const zeroPaddingHour = hour === 0 ? 12 : hour;
  const zeroPaddingMinutes = String(minutes).padStart(2, "0");
  return `${ampm} ${zeroPaddingHour}:${zeroPaddingMinutes}`;
}
