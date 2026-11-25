import { csvCell } from '../launch-list-download';

describe('csvCell', () => {
  it('quotes cells and escapes quotes', () => {
    expect(csvCell('a"b')).toBe('"a""b"');
  });

  it.each(['=1+1', '+a@example.com', '-a@example.com', '@x'])('defuses %s', (value) => {
    expect(csvCell(value)).toBe(`"'${value}"`);
  });
});
