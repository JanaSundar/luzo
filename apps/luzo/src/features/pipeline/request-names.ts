const REQUEST_NAME_PATTERN = /^Request (\d+)$/i;

export function createDefaultRequestName(existingNames: Iterable<string>) {
  const usedNumbers = new Set<number>();

  for (const name of existingNames) {
    const match = REQUEST_NAME_PATTERN.exec(name.trim());
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isInteger(value) && value > 0) {
      usedNumbers.add(value);
    }
  }

  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) {
    nextNumber += 1;
  }

  return `Request ${nextNumber}`;
}
