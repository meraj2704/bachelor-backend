// Mirrors the `BazarCategory` enum in prisma/schema.prisma.
// Kept local so TS compiles before `prisma generate` runs.
export enum BazarCategory {
  MEAT = 'MEAT',
  FISH = 'FISH',
  VEGETABLES = 'VEGETABLES',
  FRUITS = 'FRUITS',
  DAIRY = 'DAIRY',
  GROCERY = 'GROCERY',
  SPICES = 'SPICES',
  BEVERAGES = 'BEVERAGES',
  SNACKS = 'SNACKS',
  OTHER = 'OTHER',
}
