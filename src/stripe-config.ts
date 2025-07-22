export const products = [
  {
    name: 'My Wealth 360 Starter',
    priceId: 'price_1Ri18dGlaiiCwjLcoXmjeH1N',
    popular: false
  },
  {
    name: 'My Wealth 360 Family',
    priceId: 'price_1Ri18dGlaiiCwjLcoXmjeH1N',
    popular: true
  }
];

export function getProductByPriceId(priceId: string) {
  return products.find(product => product.priceId === priceId);
}