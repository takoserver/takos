import Decimal from 'npm:decimal.js';

Decimal.set({ precision: 5000 });

function calculatePiRamanujan(iterations) {
  const sqrt2 = new Decimal(2).sqrt();
  const factor = new Decimal(2).times(sqrt2).div(9801);
  let sum = new Decimal(0);

  for (let k = 0; k < iterations; k++) {
    const numerator = factorialDecimal(4 * k).times(1103 + 26390 * k);
    const denominator = factorialDecimal(k).pow(4).times(new Decimal(396).pow(4 * k));
    sum = sum.plus(numerator.div(denominator));
  }

  return new Decimal(1).div(factor.times(sum));
}

function factorialDecimal(n) {
  let result = new Decimal(1);
  for (let i = 2; i <= n; i++) {
    result = result.times(i);
  }
  return result;
}

// 実行例
const iterations = 1550; // 計算の繰り返し回数
const pi = calculatePiRamanujan(iterations);
console.log(pi.toFixed(5000)); // 100 桁まで表示
