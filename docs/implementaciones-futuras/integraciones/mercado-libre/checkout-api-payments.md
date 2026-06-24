# MD for: https://www.mercadopago.cl/developers/es/docs/checkout-api-payments/overview.md

 Integrate Checkout API and customize the whole experience  Incorporate a flexible API into your website so that customers can shop on your website or app without being redirected to an external page. 

 For online payments 

 Advanced integration 

 Without redirect 

 Total customization 

 Looking for development-free options? Explore [other solutions](https://www.mercadopago.cl/developers/en/docs#online-payments). 

![](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/8/26/1758911094301-overviewmlcmcoen.png)

 What it offers  Combine different features to ensure transaction security and conversion. 

Customization and security

  * Build your checkout tailored to your preferences.
  * Receive card transaction data securely and with minimal hassle, enabling a simplified path to PCI certification.

Flexibility to integrate

  * Adapt the integration to your business needs.

Payment optimization

  * Offer a purchasing process with just a few steps.
  * Ensure a practical and secure completion of the purchase.

 How it works 

 The customer chooses the product or service, and the entire purchase and payment process takes place in your store, with the security of Mercado Pago and without leaving your website. 

[ Discover the types of integration ](https://www.mercadopago.cl/developers/en/docs/checkout-api-payments/types-of-integration)

![](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/4/5/1746459185035-overvieworderses.gif)

[ Check the processing rates ](https://www.mercadopago.cl/developers/es/support/37740)

 Payment process 
1. Buyers select their preferred products or services on your website.
2. Once in the payment screen, they choose one of the payment methods integrated to your checkout.
3. Then, they must provide the necessary details and complete the purchase without leaving your store.
4. Once Mercado Pago’s APIs process the payment, the purchase is confirmed.
[ Discover the types of integration ](https://www.mercadopago.cl/developers/en/docs/checkout-api-payments/types-of-integration)

What sets it apartCompare our checkouts and choose the option that best fits your business. Check the [rates](https://mercadopago.com.ar/developers/es/support/37740).

You're here

![](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/8/26/1758911094301-overviewmlcmcoen.png)Checkout API[How to integrate](https://www.mercadopago.cl/developers/en/docs/checkout-api-payments/overview#:~:text=UY-,How,-to%20integrate)

Checkout Bricks[Go to summary](https://www.mercadopago.cl/developers/en/docs/checkout-bricks/landing)

Checkout Pro[Go to summary](https://www.mercadopago.cl/developers/en/docs/checkout-pro/overview)

Integration effort

Integration effort

Integration effort

Integration effort

Customization level

Customization level

Customization level

Customization level

Design ready to set up

Design ready to set up

\-

Design ready to set up

Design ready to set up

Collection experience

Collection experience

On your website

Collection experience

On your website

Collection experience

On Mercado Pago

Payment methods

Payment methods

Credit or debit card and Mercado Pago Account 

Payment methods

Credit or debit card and Mercado Pago Account 

Payment methods

 Credit or debit card, Mercado Pago Account and Installments without Card

Availability by country

Availability by country

AR

BR

CL

CO

MX

PE

UY

Availability by country

AR

BR

CL

CO

MX

PE

UY

Availability by country

AR

BR

CL

CO

MX

PE

UY

 How to integrate 

 Learn about the steps you need to follow to integrate this solution. 

 Previous requirements 
* **Mercado Pago Account**  
You need to create a user on Mercado Pago or Mercado Libre to have a [seller account](https://www.mercadopago.cl/hub/registration/landing).

 Integration process 

1. Create an application from [Your integrations](https://www.mercadopago.cl/developers/panel/app)
2. Configure the development environment
3. Configure your preferred payment methods
4. Configure payment notifications
5. Test your integration
6. Go to production
[ Discover the types of integration ](https://www.mercadopago.cl/developers/en/docs/checkout-api-payments/types-of-integration)


flowchart TD
  A[Your integrations] --> B[Create an application]
  B --> C[Configure development environment]
  C --> D[Configure payment method]
  D --> E[Configure payment notifications]
  E --> F[Test your integration]
  F --> G{Was the test successful?}
  G -- No --> H[Fix configuration] --> F
  G -- Yes --> I{What do you want to do?}
  I -- Go live --> J[Go to production]
  I -- Configure another payment method --> D
  