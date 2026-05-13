import { NextResponse } from "next/server";
import { getProducts } from "@/lib/sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json({ products });
  } catch (err) {
    console.error("GET /api/products", err);
    return NextResponse.json(
      { error: "讀取商品失敗" },
      { status: 500 }
    );
  }
}
