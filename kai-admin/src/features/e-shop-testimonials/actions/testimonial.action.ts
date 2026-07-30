"use server";

import { revalidatePath } from "next/cache";
import { EShopTestimonialsRequest } from "../infrastructure/eshop-testimonials.request";

export async function listTestimonialsAction() {
  return EShopTestimonialsRequest.list();
}

export async function createTestimonialAction(input: {
  clientName: string;
  rating: number;
  message: string;
}) {
  await EShopTestimonialsRequest.create({
    clientName: input.clientName,
    rating: input.rating,
    message: input.message,
    isActive: true,
    sortOrder: 0,
  });
  revalidatePath("/e-shop/testimonials");
}

export async function deleteTestimonialAction(id: string) {
  await EShopTestimonialsRequest.remove(id);
  revalidatePath("/e-shop/testimonials");
}
