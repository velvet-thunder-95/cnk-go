export interface TripPrice {
  month: string;
  weeks: {
    week: number;
    price: number;
  }[];
}
