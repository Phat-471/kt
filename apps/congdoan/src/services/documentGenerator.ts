const defaultDigits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readTriple(triple: number, showZeroHundred: boolean): string {
  const a = Math.floor(triple / 100);
  const b = Math.floor((triple % 100) / 10);
  const c = triple % 10;
  let result = '';

  if (a > 0 || showZeroHundred) {
    result += defaultDigits[a] + ' trăm ';
  }

  if (b > 1) {
    result += defaultDigits[b] + ' mươi ';
  } else if (b === 1) {
    result += 'mười ';
  } else if (a > 0 && c > 0) {
    result += 'lẻ ';
  }

  if (b > 1 && c === 1) {
    result += 'mốt';
  } else if (b > 0 && c === 5) {
    result += 'lăm';
  } else if (c > 0) {
    result += defaultDigits[c];
  }

  return result.trim();
}

export function numberToVietnameseWords(num: number): string {
  if (num === 0) return 'Không đồng';
  if (num < 0) return 'Âm ' + numberToVietnameseWords(Math.abs(num)).toLowerCase();

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let currentNum = Math.floor(num);
  let result = '';
  let unitIndex = 0;

  while (currentNum > 0) {
    const triple = currentNum % 1000;
    if (triple > 0) {
      const tripleStr = readTriple(triple, currentNum >= 1000);
      result = tripleStr + ' ' + units[unitIndex] + ' ' + result;
    }
    unitIndex++;
    currentNum = Math.floor(currentNum / 1000);
  }

  const finalResult = result.trim().replace(/\s+/g, ' ');
  return finalResult.charAt(0).toUpperCase() + finalResult.slice(1) + ' đồng chẵn.';
}
