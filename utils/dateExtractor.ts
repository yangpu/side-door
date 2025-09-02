// utils/dateExtractor.ts
export function extractDates(text: string, limit?: number): string[] {
  const datePattern =
    /\b(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:T.*?)?\b|\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})\b|\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))[,]?\s(\d{1,2})(?:,?\s*(\d{4}))?\b|(?:(\d{2}|\d{4})年)?(\d{1,2})月(\d{1,2})[日号]|\b(\d{1,2})月(\d{1,2})[日号](?:\s*(\d{4})年)?\b/gi;
  const matches = text.match(datePattern);

  if (!matches) return [];

  const limitedMatches = limit ? matches.slice(0, limit) : matches;

  const currentYear = new Date().getFullYear().toString();

  return limitedMatches.map((date) => {
    const parts = date.match(
      /(\d{4})[-\/]?(\d{1,2})[-\/](\d{1,2})|(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})|((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))[,]?\s(\d{1,2})(?:,?\s*(\d{4}))?|(?:(\d{2}|\d{4})年)?(\d{1,2})月(\d{1,2})[日号]|(\d{1,2})月(\d{1,2})[日号](?:\s*(\d{4})年)?\b/i
    );
    if (!parts) return date;

    let year, month, day;

    if (parts[11] && parts[12]) {
      // 处理 YYYY年MM月DD日 或 YY年MM月DD日
      year = parts[10]
        ? parts[10].length === 2
          ? '20' + parts[10]
          : parts[10]
        : currentYear;
      month = parts[11].padStart(2, '0');
      day = parts[12].padStart(2, '0');
    } else if (parts[13] && parts[14]) {
      // 处理 MM月DD日
      year = parts[15] || currentYear;
      month = parts[13].padStart(2, '0');
      day = parts[14].padStart(2, '0');
    } else if (parts[1] || (parts[2] && parts[3])) {
      // Numeric date format with optional time
      year = parts[1] || currentYear;
      month = parts[2] ? parts[2].padStart(2, '0') : '01';
      day = parts[3] ? parts[3].padStart(2, '0') : '01';
    } else if (parts[4] && parts[5] && parts[6]) {
      // MM/DD/YYYY format
      month = parts[4].padStart(2, '0');
      day = parts[5].padStart(2, '0');
      year = parts[6];
    } else {
      // Month name format
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      month = (monthNames.indexOf(parts[7]) + 1).toString().padStart(2, '0');
      day = parts[8] ? parts[8].padStart(2, '0') : '01';
      year = parts[9] || currentYear;
    }

    return `${year}-${month}-${day}`;
  });
}
