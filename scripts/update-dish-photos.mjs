import fs from 'fs';
import pg from 'pg';

const sqlPath = 'supabase/seeds/seed.sql';
let sql = fs.readFileSync(sqlPath, 'utf8');

function getAccuratePhoto(name, desc) {
  const n = name.toLowerCase();

  // 1. Real Little Saigon Restaurant photos:
  if (n.includes('chả giò chiên') && n.includes('2 pcs') && !n.includes('chay')) {
    return '/chefs/little-saigon/dishes/01.1.jpg';
  }
  if (n.includes('fresh rolls with shrimp') || (n.includes('gỏi cuốn') && n.includes('tôm') && !n.includes('tray') && !n.includes('chay'))) {
    return '/chefs/little-saigon/dishes/03-1.jpg';
  }
  if (n.includes('gỏi xoài') || n.includes('mango salad')) {
    return '/chefs/little-saigon/dishes/06.1-1.jpg';
  }
  if (n.includes('special vietnamese combo appetizer') || n.includes('khai vị thập cẩm')) {
    return '/chefs/little-saigon/dishes/13-14.jpg';
  }
  if (n.includes('bánh xèo') || n.includes('crepe') || n.includes('pancake')) {
    return '/chefs/little-saigon/dishes/banh-xeo.jpg';
  }
  if (n.includes('42.') || (n.includes('grilled pork') && n.includes('grilled chicken') && n.includes('fried egg') && n.includes('rice'))) {
    return '/chefs/little-saigon/dishes/42-2.jpg';
  }
  if (n.includes('phở đặc biệt') || n.includes('house special rice noodle soup')) {
    return '/chefs/little-saigon/dishes/pho-34.jpg';
  }
  if (n.includes('57.') || (n.includes('bún nem nướng chả giò') || (n.includes('grilled pork') && n.includes('grilled sausage') && n.includes('spring roll') && n.includes('vermicelli')))) {
    return '/chefs/little-saigon/dishes/57-2.jpg';
  }
  if (n.includes('bún đậu') || (n.includes('deep fried tofu') && n.includes('pork sausage') && n.includes('vermicelli'))) {
    return '/chefs/little-saigon/dishes/61-1.jpg';
  }
  if (n.includes('69.') || (n.includes('thin vermicelli') && n.includes('grilled shrimp'))) {
    return '/chefs/little-saigon/dishes/69.jpg';
  }
  if (n.includes('72.') || (n.includes('stir fried egg noodles') && n.includes('mixed') && n.includes('beef, chicken, shrimp'))) {
    return '/chefs/little-saigon/dishes/72-1.jpg';
  }
  if ((n.includes('sweet & sour') || n.includes('chua ngọt')) && (n.includes('rib') || n.includes('sườn') || n.includes('pork'))) {
    return '/chefs/little-saigon/dishes/91.jpg';
  }
  if (n.includes('chicken wok vegetables') || (n.includes('gà xào rau') && !n.includes('noodle'))) {
    return '/chefs/little-saigon/dishes/lunch-g.jpg';
  }
  if (n.includes('fried chicken wings tray') || (n.includes('tray') && n.includes('chicken wings'))) {
    return '/chefs/little-saigon/dishes/p3-wings-tray.jpg';
  }
  if (n.includes('thai stir fried seafood with eggplant') || n.includes('t10')) {
    return '/chefs/little-saigon/dishes/t10-thai-seafood.jpg';
  }

  // 2. Phở Dishes
  if (n.includes('phở gà') || n.includes('chicken rice noodle soup')) {
    return 'https://images.unsplash.com/photo-1594998893017-36147cbcae05?w=600&q=80';
  }
  if (n.includes('sườn') || n.includes('back rib') || n.includes('short rib')) {
    return 'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=600&q=80';
  }
  if (n.includes('sa tế') || n.includes('saté') || n.includes('bún bò huế') || n.includes('huế style')) {
    return 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80';
  }
  if (n.includes('phở') || n.includes('beef noodle soup') || n.includes('rice noodle soup')) {
    return 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&q=80';
  }

  // 3. Soups & Wontons
  if (n.includes('wonton soup') || n.includes('súp hoành thánh')) {
    return 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=600&q=80';
  }
  if (n.includes('cream cheese wontons') || n.includes('crispy wonton')) {
    return 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80';
  }
  if (n.includes('hủ tiếu') || n.includes('mì thập cẩm') || n.includes('clear noodle soup') || n.includes('egg noodle soup')) {
    return 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80';
  }

  // 4. Pad Thai
  if (n.includes('pad thai')) {
    return 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&q=80';
  }

  // 5. Stir-Fried Noodles (Mì Xào / Phở Xào)
  if (n.includes('stir-fried flat rice') || n.includes('phở xào') || n.includes('hủ tiếu xào')) {
    return 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&q=80';
  }
  if (n.includes('egg noodle') || n.includes('mì xào')) {
    return 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=80';
  }

  // 6. Vermicelli Bowls (Bún)
  if (n.startsWith('bún') || n.includes('vermicelli')) {
    return 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80';
  }

  // 7. Fried Rice (Cơm Chiên)
  if (n.includes('cơm chiên') || n.includes('fried rice')) {
    return 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80';
  }

  // 8. Rice Dishes (Cơm Dĩa / Cơm Tấm)
  if (n.includes('pork chop') || n.includes('sườn')) {
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80';
  }
  if (n.includes('cơm') || n.includes('steamed rice') || n.includes('broken rice')) {
    return 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80';
  }

  // 9. Curries (Cà Ri)
  if (n.includes('curry') || n.includes('cà ri')) {
    return 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&q=80';
  }

  // 10. Fish & Seafood Stews
  if (n.includes('pompano') || n.includes('cá chim') || n.includes('fish')) {
    return 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80';
  }
  if (n.includes('canh chua') || n.includes('tamarind soup') || n.includes('hot pot') || n.includes('lẩu')) {
    return 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80';
  }

  // 11. Wings & Shrimp
  if (n.includes('chicken wings') || n.includes('cánh gà')) {
    return 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80';
  }
  if (n.includes('butterfly shrimp') || n.includes('tôm lăn bột') || (n.includes('shrimp') && n.includes('fried'))) {
    return 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&q=80';
  }

  // 12. Tofu & Vegetarian
  if (n.includes('tofu') || n.includes('đậu hũ') || n.includes('chay')) {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80';
  }
  if (n.includes('vegetable') || n.includes('rau') || n.includes('broccoli') || n.includes('snow pea')) {
    return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80';
  }

  // 13. Congee (Cháo)
  if (n.includes('congee') || n.includes('cháo')) {
    return 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80';
  }

  // 14. Smoothies (Sinh Tố)
  if (n.includes('avocado') || n.includes('bơ')) {
    return 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&q=80';
  }
  if (n.includes('mango') && (n.includes('smoothie') || n.includes('milkshake') || n.includes('sinh tố'))) {
    return 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=600&q=80';
  }
  if (n.includes('strawberry') && (n.includes('smoothie') || n.includes('milkshake') || n.includes('sinh tố'))) {
    return 'https://images.unsplash.com/photo-1553530979-7ee52a2670c4?w=600&q=80';
  }
  if (n.includes('smoothie') || n.includes('milkshake') || n.includes('sinh tố')) {
    return 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&q=80';
  }

  // 15. Beverages
  if (n.includes('coffee') || n.includes('cà phê')) {
    return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80';
  }
  if (n.includes('matcha')) {
    return 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80';
  }
  if (n.includes('milk') || n.includes('sữa')) {
    return 'https://images.unsplash.com/photo-1558857563-b371b2d71182?w=600&q=80';
  }
  if (n.includes('coconut juice') || n.includes('nước dừa')) {
    return 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=600&q=80';
  }
  if (n.includes('water') || n.includes('nước suối')) {
    return 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&q=80';
  }
  if (n.includes('soda') || n.includes('lemonade') || n.includes('juice') || n.includes('chanh')) {
    return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80';
  }

  // 16. Desserts
  if (n.includes('sticky rice') || n.includes('xôi')) {
    return 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=600&q=80';
  }
  if (n.includes('ice cream') || n.includes('kem')) {
    return 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80';
  }
  if (n.includes('chè') || n.includes('dessert') || n.includes('purple rice')) {
    return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&q=80';
  }

  return 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80';
}

const rowRegex = /(\('17e30000-0004-4000-8000-[0-9a-f]{12}',\s*'4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a',\s*'ca700000-0004-4000-8000-[0-9a-f]{12}',\s*'([^']+)',\s*'([^']*)',\s*([0-9.]+),\s*)'([^']+)'/g;

let count = 0;
const newSql = sql.replace(rowRegex, (match, prefix, name, desc, price, oldUrl) => {
  count++;
  const newUrl = getAccuratePhoto(name, desc);
  return `${prefix}'${newUrl}'`;
});

console.log(`Replaced image URLs for ${count} Little Saigon dishes in seed.sql`);
fs.writeFileSync(sqlPath, newSql);

const seedRemotePath = 'scripts/seed-remote-little-saigon.mjs';
let seedRemoteSql = fs.readFileSync(seedRemotePath, 'utf8');
const newSeedRemote = seedRemoteSql.replace(rowRegex, (match, prefix, name, desc, price, oldUrl) => {
  const newUrl = getAccuratePhoto(name, desc);
  return `${prefix}'${newUrl}'`;
});
fs.writeFileSync(seedRemotePath, newSeedRemote);
console.log(`Updated scripts/seed-remote-little-saigon.mjs`);

if (process.env.DATABASE_URL) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to remote database for photo update...');

  // Parse all matches to get id and photo url
  const matches = [...newSql.matchAll(/\('(17e30000-0004-4000-8000-[0-9a-f]{12})',\s*'4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a',\s*'ca700000-0004-4000-8000-[0-9a-f]{12}',\s*'([^']+)',\s*'([^']*)',\s*([0-9.]+),\s*'([^']+)'/g)];

  await client.query('BEGIN');
  for (const m of matches) {
    const id = m[1];
    const imgUrl = m[5];
    await client.query('UPDATE menu_items SET image_url = $1 WHERE id = $2', [imgUrl, id]);
  }
  await client.query('COMMIT');
  console.log(`Updated ${matches.length} menu_items image_urls in remote DB!`);
  await client.end();
}
