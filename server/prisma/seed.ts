import { PrismaClient, Role, ProductCondition, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const img = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

async function main() {
  console.log('🌱 Seeding SEMMAI…');

  // Clean slate (order matters for FK constraints)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('Password123!', 10);

  // ── Users ──────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: 'admin@shoppyfy.com',
      password,
      firstName: 'Ahmed',
      lastName: 'Ibrahim',
      role: Role.ADMIN,
    },
  });

  const sellerAhmed = await prisma.user.create({
    data: {
      email: 'ibrahim.offl24@gmail.com',
      password,
      firstName: 'Ahmed',
      lastName: 'Ibrahim',
      role: Role.SELLER,
    },
  });

  const buyer = await prisma.user.create({
    data: {
      email: 'intrepidkid1804@gmail.com',
      password,
      firstName: 'Karthik',
      lastName: 'Doyan',
      role: Role.BUYER,
      addresses: {
        create: [
          {
            label: 'Home',
            fullName: 'Karthik Doyan',
            line1: '128 Greene Street',
            line2: 'Apt 4B',
            city: 'New York',
            state: 'NY',
            postalCode: '10012',
            country: 'US',
            phone: '+1 (212) 555-0184',
            isDefault: true,
          },
          {
            label: 'Work',
            fullName: 'Karthik Doyan',
            line1: '450 W 15th Street',
            city: 'New York',
            state: 'NY',
            postalCode: '10011',
            country: 'US',
          },
        ],
      },
    },
  });

  // ── Categories ─────────────────────────────────────────
  const categoriesData = [
    { name: 'Dresses', slug: 'dresses', imageUrl: img('photo-1595777457583-95e059d581b8') },
    { name: 'Outerwear', slug: 'outerwear', imageUrl: img('photo-1539533397314-b1d04dd83b39') },
    { name: 'Knitwear', slug: 'knitwear', imageUrl: img('photo-1576871337632-b9aef4c17ab9') },
    { name: 'Denim', slug: 'denim', imageUrl: img('photo-1542272604-787c3835535d') },
    { name: 'Tailoring', slug: 'tailoring', imageUrl: img('photo-1594938298603-c8148c4dae35') },
    { name: 'Footwear', slug: 'footwear', imageUrl: img('photo-1543163521-1bf539c55dd2') },
    { name: 'Accessories', slug: 'accessories', imageUrl: img('photo-1584917865442-de89df76afd3') },
  ];
  const categories: Record<string, string> = {};
  for (const c of categoriesData) {
    const created = await prisma.category.create({ data: c });
    categories[c.slug] = created.id;
  }

  // ── Products ───────────────────────────────────────────
  type P = {
    name: string; slug: string; description: string; price: number; comparePrice?: number;
    images: string[]; sizes: string[]; colors: string[]; brand: string;
    condition?: ProductCondition; stock: number; category: string; seller: string; featured?: boolean;
  };

  const products: P[] = [
    {
      name: 'The Silk Column Dress',
      slug: 'silk-column-dress',
      description:
        'A floor-grazing column silhouette cut from 22-momme mulberry silk. Bias-cut for fluid drape, with a low cowl back and hand-rolled hems. An editorial staple for evenings that demand quiet drama.',
      price: 348, comparePrice: 420,
      images: [img('photo-1595777457583-95e059d581b8'), img('photo-1566174053879-31528523f8ae')],
      sizes: ['XS', 'S', 'M', 'L'], colors: ['Ivory', 'Onyx'],
      brand: 'Maison Verne', stock: 14, category: 'dresses', seller: sellerAhmed.id, featured: true,
    },
    {
      name: 'Sculpted Wool Overcoat',
      slug: 'sculpted-wool-overcoat',
      description:
        'Double-faced virgin wool overcoat with an exaggerated lapel and dropped shoulder. Fully canvassed, finished with corozo buttons. Tailored in a relaxed, architectural line.',
      price: 590, comparePrice: 740,
      images: [img('photo-1539533397314-b1d04dd83b39'), img('photo-1544022613-e87ca75a784a')],
      sizes: ['S', 'M', 'L', 'XL'], colors: ['Camel', 'Charcoal'],
      brand: 'Atelier Noir', stock: 8, category: 'outerwear', seller: sellerAhmed.id, featured: true,
    },
    {
      name: 'Cashmere Crewneck — Brushed',
      slug: 'cashmere-crewneck-brushed',
      description:
        'Four-ply Mongolian cashmere, garment-dyed and brushed for a cloud-soft hand. Ribbed collar and cuffs hold their shape season after season.',
      price: 245,
      images: [img('photo-1576871337632-b9aef4c17ab9'), img('photo-1583743814966-8936f5b7be1a')],
      sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Oat', 'Slate', 'Forest'],
      brand: 'Maison Verne', stock: 22, category: 'knitwear', seller: sellerAhmed.id, featured: true,
    },
    {
      name: 'High-Rise Straight Jean',
      slug: 'high-rise-straight-jean',
      description:
        'Rigid 13.5oz Japanese selvedge denim with a high rise and a clean straight leg. Cut to crop just above the ankle. Fades beautifully with wear.',
      price: 185,
      images: [img('photo-1542272604-787c3835535d'), img('photo-1541099649105-f69ad21f3246')],
      sizes: ['24', '25', '26', '27', '28', '29', '30'], colors: ['Indigo', 'Washed Black'],
      brand: 'Atelier Noir', stock: 30, category: 'denim', seller: sellerAhmed.id,
    },
    {
      name: 'The Editor Blazer',
      slug: 'the-editor-blazer',
      description:
        'Single-breasted blazer in a dry Italian wool-mohair blend. Softly padded shoulder, single vent, horn buttons. Wears as easily over denim as it does tailoring.',
      price: 425, comparePrice: 510,
      images: [img('photo-1594938298603-c8148c4dae35'), img('photo-1507679799987-c73779587ccf')],
      sizes: ['XS', 'S', 'M', 'L'], colors: ['Black', 'Pinstripe Grey'],
      brand: 'Maison Verne', stock: 11, category: 'tailoring', seller: sellerAhmed.id, featured: true,
    },
    {
      name: 'Pleated Midi Skirt',
      slug: 'pleated-midi-skirt',
      description:
        'Knife-pleated midi skirt in a fluid recycled twill. Elasticated back waist for ease; pleats are heat-set to survive travel and rain alike.',
      price: 168,
      images: [img('photo-1583496661160-fb5886a13d27'), img('photo-1551163943-3f6a855d1153')],
      sizes: ['XS', 'S', 'M', 'L'], colors: ['Bone', 'Navy'],
      brand: 'Maison Verne', stock: 19, category: 'dresses', seller: sellerAhmed.id,
    },
    {
      name: 'Cropped Leather Jacket',
      slug: 'cropped-leather-jacket',
      description:
        'Vegetable-tanned lambskin moto with a cropped, boxy body. Antique nickel hardware, quilted satin lining. Pre-loved, gently broken in.',
      price: 410, comparePrice: 680,
      images: [img('photo-1551028719-00167b16eac5'), img('photo-1520975954732-35dd22299614')],
      sizes: ['S', 'M'], colors: ['Black'],
      brand: 'Atelier Noir', condition: ProductCondition.LIKE_NEW, stock: 2, category: 'outerwear', seller: sellerAhmed.id,
    },
    {
      name: 'Merino Roll-Neck',
      slug: 'merino-roll-neck',
      description:
        'Extra-fine 19.5-micron merino roll-neck, knit seamlessly in one piece. A second-skin layer under tailoring or worn alone.',
      price: 128,
      images: [img('photo-1608257735467-7080d986a14a'), img('photo-1610652492500-ded49ceeb378')],
      sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Black', 'Ecru', 'Burgundy'],
      brand: 'Maison Verne', stock: 27, category: 'knitwear', seller: sellerAhmed.id,
    },
    {
      name: 'Wide-Leg Trouser — Crepe',
      slug: 'wide-leg-trouser-crepe',
      description:
        'Floor-skimming wide-leg trouser in a weighty triacetate crepe. Pressed front crease, extended waist tab, pockets that lie flat.',
      price: 210,
      images: [img('photo-1594633312681-425c7b97ccd1'), img('photo-1509551388413-e18d0ac5d495')],
      sizes: ['XS', 'S', 'M', 'L'], colors: ['Black', 'Ivory'],
      brand: 'Atelier Noir', stock: 16, category: 'tailoring', seller: sellerAhmed.id,
    },
    {
      name: 'Leather Ankle Boot',
      slug: 'leather-ankle-boot',
      description:
        'Almond-toe ankle boot on a 55mm stacked heel. Italian calf leather, leather sole with rubber injection, side zip.',
      price: 320, comparePrice: 395,
      images: [img('photo-1543163521-1bf539c55dd2'), img('photo-1605812860427-4024433a70fd')],
      sizes: ['36', '37', '38', '39', '40', '41'], colors: ['Black', 'Espresso'],
      brand: 'Maison Verne', stock: 12, category: 'footwear', seller: sellerAhmed.id, featured: true,
    },
    {
      name: 'Silk Twill Scarf — Archive Print',
      slug: 'silk-twill-scarf-archive',
      description:
        '90×90cm silk twill scarf with hand-rolled edges, printed with a reissued archive motif from our first collection.',
      price: 95,
      images: [img('photo-1584917865442-de89df76afd3'), img('photo-1601924994987-69e26d50dc26')],
      sizes: ['One Size'], colors: ['Sienna', 'Cobalt'],
      brand: 'Maison Verne', stock: 35, category: 'accessories', seller: sellerAhmed.id,
    },
    {
      name: 'Structured Tote — Grain Leather',
      slug: 'structured-tote-grain-leather',
      description:
        'East-west tote in pebbled grain leather with a suede interior, magnetic closure, and detachable zip pouch. Fits a 14" laptop.',
      price: 380,
      images: [img('photo-1590874103328-eac38a683ce7'), img('photo-1548036328-c9fa89d128fa')],
      sizes: ['One Size'], colors: ['Tan', 'Black'],
      brand: 'Atelier Noir', stock: 9, category: 'accessories', seller: sellerAhmed.id,
    },
    {
      name: 'Linen Camp Shirt',
      slug: 'linen-camp-shirt',
      description:
        'Relaxed camp-collar shirt in washed Belgian linen. Mother-of-pearl buttons, single chest pocket, garment-washed for softness.',
      price: 145,
      images: [img('photo-1596755094514-f87e34085b2c'), img('photo-1602810318383-e386cc2a3ccf')],
      sizes: ['S', 'M', 'L', 'XL'], colors: ['White', 'Sage', 'Sand'],
      brand: 'Atelier Noir', stock: 24, category: 'tailoring', seller: sellerAhmed.id,
    },
    {
      name: 'The Slip Dress — Bias Cut',
      slug: 'slip-dress-bias-cut',
      description:
        'The definitive slip dress in sandwashed silk charmeuse. Adjustable straps, bias-cut through the body, midi length.',
      price: 265,
      images: [img('photo-1566174053879-31528523f8ae'), img('photo-1572804013309-59a88b7e92f1')],
      sizes: ['XS', 'S', 'M', 'L'], colors: ['Champagne', 'Black'],
      brand: 'Maison Verne', stock: 18, category: 'dresses', seller: sellerAhmed.id,
    },
    {
      name: 'Raw-Hem Denim Jacket',
      slug: 'raw-hem-denim-jacket',
      description:
        'Boxy trucker jacket in untreated organic denim with a released raw hem. Ages with character; pre-loved with light fading.',
      price: 120, comparePrice: 195,
      images: [img('photo-1576995853123-5a10305d93c0'), img('photo-1527016021513-b09758b777bd')],
      sizes: ['S', 'M', 'L'], colors: ['Mid Indigo'],
      brand: 'Atelier Noir', condition: ProductCondition.GOOD, stock: 3, category: 'denim', seller: sellerAhmed.id,
    },
    {
      name: 'Pointed Slingback Heel',
      slug: 'pointed-slingback-heel',
      description:
        'Pointed-toe slingback on a sculpted 65mm heel. Nappa leather upper with an elasticated strap for all-day wear.',
      price: 275,
      images: [img('photo-1596703263926-eb0762ee17e4'), img('photo-1573100925118-870b8efc799d')],
      sizes: ['36', '37', '38', '39', '40'], colors: ['Noir', 'Crème'],
      brand: 'Maison Verne', stock: 10, category: 'footwear', seller: sellerAhmed.id,
    },
  ];

  const createdProducts: { id: string; slug: string; price: number; name: string; image: string }[] = [];
  for (const p of products) {
    const created = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        comparePrice: p.comparePrice,
        images: p.images,
        sizes: p.sizes,
        colors: p.colors,
        brand: p.brand,
        condition: p.condition ?? ProductCondition.NEW,
        stock: p.stock,
        isFeatured: p.featured ?? false,
        categoryId: categories[p.category],
        sellerId: p.seller,
      },
    });
    createdProducts.push({ id: created.id, slug: p.slug, price: p.price, name: p.name, image: p.images[0] });
  }

  // ── Reviews ────────────────────────────────────────────
  const reviewers = [buyer, admin];
  const reviewSeeds: [string, number, string, string][] = [
    ['silk-column-dress', 5, 'Worth every penny', 'The drape is unreal — photographs do not do it justice. True to size.'],
    ['sculpted-wool-overcoat', 5, 'Heirloom quality', 'Heavy, structured, warm. The lapel makes the whole coat.'],
    ['cashmere-crewneck-brushed', 4, 'Soft but pills slightly', 'Incredibly soft. Minor pilling under the arms after a month.'],
    ['high-rise-straight-jean', 5, 'Perfect rigid denim', 'Breaks in beautifully. Size up one if between sizes.'],
    ['leather-ankle-boot', 4, 'Elegant, runs narrow', 'Gorgeous shape, but go half a size up for wider feet.'],
    ['the-editor-blazer', 5, 'Sharp shoulders', 'Best blazer I own. The mohair gives it a dry, expensive feel.'],
  ];
  for (let i = 0; i < reviewSeeds.length; i++) {
    const [slug, rating, title, comment] = reviewSeeds[i];
    const product = createdProducts.find((p) => p.slug === slug)!;
    await prisma.review.create({
      data: {
        userId: reviewers[i % reviewers.length].id,
        productId: product.id,
        rating,
        title,
        comment,
      },
    });
  }

  // ── Wishlist + Cart for the demo buyer ─────────────────
  for (const slug of ['sculpted-wool-overcoat', 'slip-dress-bias-cut', 'structured-tote-grain-leather']) {
    const product = createdProducts.find((p) => p.slug === slug)!;
    await prisma.wishlist.create({ data: { userId: buyer.id, productId: product.id } });
  }

  const cart = await prisma.cart.create({ data: { userId: buyer.id } });
  const cartProduct = createdProducts.find((p) => p.slug === 'cashmere-crewneck-brushed')!;
  await prisma.cartItem.create({
    data: { cartId: cart.id, productId: cartProduct.id, quantity: 1, size: 'M', color: 'Oat' },
  });

  // ── A delivered order with tracking, for the Orders/Tracking pages ──
  const op1 = createdProducts.find((p) => p.slug === 'the-editor-blazer')!;
  const op2 = createdProducts.find((p) => p.slug === 'merino-roll-neck')!;
  const subtotal = op1.price + op2.price;
  const shippingCost = 0;
  const tax = Math.round(subtotal * 0.08 * 100) / 100;

  await prisma.order.create({
    data: {
      orderNumber: 'SHP-2026-000184',
      userId: buyer.id,
      status: OrderStatus.DELIVERED,
      subtotal,
      shipping: shippingCost,
      tax,
      total: subtotal + shippingCost + tax,
      shipFullName: 'Karthik Doyan',
      shipLine1: '128 Greene Street',
      shipLine2: 'Apt 4B',
      shipCity: 'New York',
      shipState: 'NY',
      shipPostalCode: '10012',
      shipCountry: 'US',
      shipPhone: '+1 (212) 555-0184',
      trackingNumber: '1Z999AA10123456784',
      carrier: 'UPS',
      estimatedDelivery: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      deliveredAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      createdAt: new Date(Date.now() - 9 * 24 * 3600 * 1000),
      items: {
        create: [
          { productId: op1.id, productName: op1.name, imageUrl: op1.image, price: op1.price, quantity: 1, size: 'S', color: 'Black' },
          { productId: op2.id, productName: op2.name, imageUrl: op2.image, price: op2.price, quantity: 1, size: 'M', color: 'Ecru' },
        ],
      },
    },
  });

  console.log('✅ Seed complete.');
  console.log('   Demo accounts (password: Password123!):');
  console.log('   admin@shoppyfy.com (admin) · ibrahim.offl24@gmail.com (seller) · intrepidkid1804@gmail.com (buyer)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
