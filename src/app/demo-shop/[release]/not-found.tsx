/** Kota Express's own 404, inside the shop's header and footer, so it never looks like TestPilot. */
export default function ShopNotFound() {
  return (
    <section className="space-y-3">
      <h1 className="text-4xl font-extrabold text-kota-crust">Page not found</h1>
      <p className="max-w-[60ch]">
        That page isn&apos;t on our menu. Use the links at the top to get back to your order.
      </p>
    </section>
  );
}
