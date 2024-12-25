function getTimestampFromUUIDv7(uuid: string) {
  // Split the UUID to get the time-related section (the first 8 bytes)
  const timeHex = uuid.replace(/-/g, "").substring(0, 12);

  // Parse the hex string to an integer
  const timestamp = parseInt(timeHex, 16);

  // Convert to milliseconds (UUID v7 timestamp is in milliseconds)
  return new Date(timestamp).toISOString();
}

export { getTimestampFromUUIDv7 };
