// tests/dateExtractor.test.ts
import { extractDates } from './dateExtractor';

describe('extractDates', () => {
  it('should extract and format dates in various formats', () => {
    const text =
      'Here are some dates: 2024-10-1, 2024-06-03, 6-8, 09-12, Oct 10, Oct 6,2023.';
    const expectedDates = [
      '2024-10-01',
      '2024-06-03',
      '2024-10-10',
      '2023-10-06',
    ];

    const result = extractDates(text);
    console.log(result);
    expect(result).toEqual(expectedDates);
  });

  it('should return an empty array if no dates are found', () => {
    const text = 'There are no dates here.';
    expect(extractDates(text)).toEqual([]);
  });

  it('should correctly extract and format a date with month name and day', () => {
    const text = 'The event is on Oct 11.';
    const expectedDates = ['2024-10-11']; // Assuming the current year is 2024

    const result = extractDates(text);
    console.log(result);
    expect(result).toEqual(expectedDates);
  });

  it('should extract date from <time> tag', () => {
    const text =
      '<time datetime="2024-10-31T19:02:44.652Z+08:00" title="10/19/2024, 7:02:44 PM">2 days ago</time>';
    const expectedDates = ['2024-10-31', '2024-10-19'];

    const result = extractDates(text);
    console.log(result);
    expect(result).toEqual(expectedDates);
  });

  it('should extract dates from Chinese text', () => {
    const text = '活动将在2024年10月1日举行，下一场在10月15日。';
    const expectedDates = ['2024-10-01', '2024-10-15'];

    const result = extractDates(text);
    console.log(result);
    expect(result).toEqual(expectedDates);
  });

  it('should extract dates from HTML content', () => {
    const text = `
      <abbr class="published" title="2024-10-31T03:24:05+08:00">2024年10月25日</abbr>
    `;
    const expectedDates = ['2024-10-31', '2024-10-25'];

    const result = extractDates(text);
    console.log(result);
    expect(result).toEqual(expectedDates);
  });

  it('should extract dates from ISO', () => {
    const text = `
      <abbr class="published" title="2024-10-31T19:02:44.652Z+08:00"></abbr>
    `;
    const expectedDates = ['2024-10-31'];

    const result = extractDates(text);
    console.log(result);
    expect(result).toEqual(expectedDates);
  });
});
