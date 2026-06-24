import { TextStyle } from 'react-native';

export const typography: Record<string, TextStyle> = {
  h1: { fontSize: 28, fontWeight: '900', lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  captionBold: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '600', lineHeight: 14, letterSpacing: 0.5, textTransform: 'uppercase' },
  priceXL: { fontSize: 36, fontWeight: '900', lineHeight: 40, fontVariant: ['tabular-nums'] },
  priceLG: { fontSize: 28, fontWeight: '800', lineHeight: 34, fontVariant: ['tabular-nums'] },
  priceMD: { fontSize: 20, fontWeight: '800', lineHeight: 26, fontVariant: ['tabular-nums'] },
};
