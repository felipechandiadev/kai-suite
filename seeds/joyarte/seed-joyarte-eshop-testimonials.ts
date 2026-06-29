export type SeedJoyarteEshopTestimonialDef = {
  key: string;
  clientName: string;
  rating: number;
  message: string;
  sortOrder: number;
  imageFile?: string;
};

export const SEED_JOYARTE_ESHOP_TESTIMONIALS: readonly SeedJoyarteEshopTestimonialDef[] = [
  {
    key: 'gabriela',
    clientName: 'Gabriela',
    rating: 5,
    message:
      'Le compré sus primeros aritos de perla a mi bebé en Joyarte y fue la mejor elección. Son delicados, seguros y mantienen un brillo muy fino.',
    sortOrder: 1,
    imageFile: 'testimonials/01-gabriela.jpg',
  },
  {
    key: 'manuel',
    clientName: 'Manuel',
    rating: 5,
    message:
      'Viajé a Santiago para comprar un anillo de compromiso. La asesoría fue clave para elegir la pieza perfecta dentro de mi presupuesto.',
    sortOrder: 2,
    imageFile: 'testimonials/02-manuel.jpg',
  },
  {
    key: 'claudia',
    clientName: 'Claudia',
    rating: 5,
    message:
      'Estuvieron presentes en el momento más importante de nuestras vidas. La asesoría fue excelente y las piezas llegaron a tiempo.',
    sortOrder: 3,
    imageFile: 'testimonials/03-claudia.jpg',
  },
  {
    key: 'javiera',
    clientName: 'Javiera',
    rating: 5,
    message:
      'Nuestras argollas de matrimonio son de muy buena calidad. Muy recomendable para quienes buscan confianza y diseño.',
    sortOrder: 4,
    imageFile: 'testimonials/04-javiera.jpg',
  },
  {
    key: 'valeria',
    clientName: 'Valeria',
    rating: 5,
    message:
      'Compramos nuestras argollas con asesoría personalizada. La atención fue amable y el resultado superó nuestras expectativas.',
    sortOrder: 5,
    imageFile: 'testimonials/05-valeria.jpg',
  },
  {
    key: 'evelyn',
    clientName: 'Evelyn',
    rating: 5,
    message:
      'Mi anillo de nacimiento fue una sorpresa preciosa. Cumplieron los tiempos de entrega y la experiencia fue muy buena.',
    sortOrder: 6,
    imageFile: 'testimonials/06-evelyn.jpg',
  },
] as const;
