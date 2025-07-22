import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30-basic' as any, // Corrige o tipo ou força a versão
  });

export async function ensureProductExists() {
  try {
    // Tente buscar o produto primeiro
    const product = await stripe.products.retrieve(process.env.STRIPE_PRODUCT_ID!);
    return product;
  } catch (error) {
    if ((error as Stripe.errors.StripeError).code === 'resource_missing') {
      // Se o produto não existir, crie um novo
      const product = await stripe.products.create({
        id: process.env.STRIPE_PRODUCT_ID,
        name: 'Sua Assinatura',
        description: 'Descrição da sua assinatura',
        active: true,
      });

      // Crie também o preço associado ao produto
      await stripe.prices.create({
        product: product.id,
        unit_amount: 2990, // R$ 29,90 em centavos
        currency: 'brl',
        recurring: {
          interval: 'month'
        },
      });

      return product;
    }
    throw error;
  }
}