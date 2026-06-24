# MD for: https://www.mercadopago.cl/developers/es/docs/mp-point/overview.md

 Integrate Mercado Pago Point into your business model  Transform the payment experience by integrating Point terminals into your point of sale (POS) system. This integration allows you to process in-person payments with cards (including meal cards), and perform an automatic reconciliation of your sales with Mercado Pago in a unified manner. 

 In-person payments 

 Multiple payment methods 

 Automatic reconciliation 

 Service experience with or without operator 

 Are you looking for development-free options? Get a [card reader ready to operate](https://www.mercadopago.com.br/ferramentas-para-vender/maquininhas-point?code=POINT%5FORG%5FLEGACY). 

![](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/5/19/1750357851664-terminalsmlbes.png)

 How it works 

 By integrating payments with the Point terminals, you will link them directly to your point of sale system. This way, you can process payments in a unified manner, reducing the possibility of unintentional errors and ensuring synchronization between your system and Mercado Pago. 

[ How to integrate ](https://www.mercadopago.cl/developers/en/docs/mp-point/create-application)

![](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/5/23/1750690996278-howitworksen.png)

[ Check the processing rates ](https://www.mercadopago.com.br/developers/pt/support/37740)

 Payment collection process 
1. Create the payment order from your system using our unified API.
2. The Point terminal will automatically load the order.
3. The buyer makes the payment with the selected payment method.
4. The integrated system receives notification of the payment status.
[ How to integrate ](https://www.mercadopago.cl/developers/en/docs/mp-point/create-application)

 What it offers  Unlike models without integration, where each payment must be processed and reconciled manually, integrating Mercado Pago Point into your point of sale transforms your experience. 

Agility in management

  * Manage payments directly from your system.
  * Automatically reconcile operations with Mercado Pago.

Payment experience

  * Offer multiple payment methods and adapt to each buyer.
  * Choose whether to offer installments [with](https://www.mercadopago.com.br/ajuda/24694) or [without](https://www.mercadopago.cl/developers/pt/support/oferecer-parcelas-sem-acrescimo-para-compradores%5F454).

Unified API

  * Integrate different payment solutions without having to work with several separate APIs.
  * Simplify your integration process with Mercado Pago.

Efficiency and security

  * Optimize your business's performance by automating tasks and reducing errors in collections and reconciliation.
  * Protect data involved in transactions using HTTPS protocols and OAuth authentications.

Available terminalsBelow are the terminals that allow you to integrate your business with Mercado Pago Point. If you do not have one, access the [official store](https://www.mercadopago.cl/herramientas-para-vender/lectores-point).

![](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/5/19/1750364222941-terminalsmart2es.png)Point Smart 2[Go to store](https://www.mercadopago.cl/herramientas-para-vender/lectores-point)

Card payments

Card payments

Debit, credit and prepaid, with chip technology, NFC and magnetic stripe.

Payments with meal cards and in cash

Payments with meal cards and in cash

QR code payments

QR code payments

Tips

Tips

 How to integrate 

 Learn the steps you need to follow to integrate Mercado Pago Point. 

 Prerequisites 
* **Mercado Pago Point Smart terminal**  
To offer in-person payments through Point, it is necessary to acquire the machine. If you haven't done so yet, go to the [store](https://www.mercadopago.cl/herramientas-para-vender/lectores-point).
* **Mercado Pago app on your phone**  
Along with the machine, it is necessary to have the Mercado Pago app on your phone to log into the terminal. You can download it for [Android](https://play.google.com/store/apps/details?id=com.mercadopago.wallet&hl=es%5F419) or [iOS](https://apps.apple.com/ar/app/mercado-pago/id925436649) devices.
* **Mercado Pago account**  
You need to create a user in Mercado Pago or Mercado Libre to have a [seller account](https://www.mercadopago.cl/hub/registration/landing), either for an [own integration](https://www.mercadopago.cl/developers/en/docs/mp-point/create-application#:~:text=access%20your%20credentials.-,Get,-credentials%20for%20a) or for [third parties](https://www.mercadopago.cl/developers/en/docs/mp-point/create-application#:~:text=a%20personal%20integration-,Get,-credentials%20for%20a).

 Integration process 

1. [Create your application](https://www.mercadopago.cl/developers/en/docs/mp-point/create-application) from [Your integrations](https://www.mercadopago.cl/developers/panel/app).
2. [Configure your Point terminal](https://www.mercadopago.cl/developers/en/docs/mp-point/configure-terminal).
3. [Integrate payment processing](https://www.mercadopago.cl/developers/en/docs/mp-point/payment-processing).
4. [Configure terminal printing](https://www.mercadopago.cl/developers/en/docs/mp-point/configure-printings).
5. [Set up your payment notifications](https://www.mercadopago.cl/developers/en/docs/mp-point/notifications).
6. [Test your integration](https://www.mercadopago.cl/developers/en/docs/mp-point/integration-test).
7. [Go to production](https://www.mercadopago.cl/developers/en/docs/mp-point/go-to-production).
[ I want to start integrating ](https://www.mercadopago.cl/developers/en/docs/mp-point/create-application)


  flowchart TD
  A[Create your application from Your integrations] --> B[Configure your Point terminal]
  B --> C[Integrate payment processing]
  C --> D[Configure terminal printing]
  D --> E[Set up your payment notifications]
  E --> F[Test your integration]
  F --> G[Go to production]
  