'use client'

import { motion } from 'framer-motion'

export default function PoliciesPage() {
  return (
    <div className="min-h-screen pt-32 pb-24 max-w-4xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="font-heading text-4xl md:text-5xl text-velvet-white mb-12 text-center uppercase tracking-widest">
          Store Policies
        </h1>

        <div className="space-y-12 text-velvet-muted font-light leading-relaxed">
          {/* Exchanges & Returns */}
          <section>
            <h2 className="text-xl text-velvet-white mb-4 uppercase tracking-wider">
              Returns & Exchanges
            </h2>
            <p className="mb-4">
              At Velvet Syndicate, we stand behind the quality of our footwear. If you are not completely satisfied with your purchase, we offer a <strong>7-day return and exchange policy</strong> from the date of delivery.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Items must be returned in their original, unworn, and unwashed condition with all original tags and packaging intact.</li>
              <li>Exchanges are subject to inventory availability. If your desired size or color is unavailable, a refund or store credit will be issued.</li>
              <li>Any items showing signs of wear, damage, or alteration will not be accepted and will be sent back to the customer.</li>
            </ul>
          </section>

          {/* Shipping Policy */}
          <section>
            <h2 className="text-xl text-velvet-white mb-4 uppercase tracking-wider">
              Shipping & Delivery
            </h2>
            <p className="mb-4">
              We offer complimentary standard shipping on all orders. Please allow 1-2 business days for order processing before your items are dispatched.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Standard delivery typically takes 7-8 business days.</li>
              <li>You will receive a tracking link via email once your order has shipped.</li>
              <li>We are not responsible for delays caused by courier services or customs clearance.</li>
            </ul>
          </section>

          {/* Privacy Policy */}
          <section>
            <h2 className="text-xl text-velvet-white mb-4 uppercase tracking-wider">
              Privacy Policy
            </h2>
            <p className="mb-4">
              Your privacy is of the utmost importance to us. Velvet Syndicate collects personal information (such as your name, address, and email) solely to process your orders and improve your shopping experience.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>We do not sell, rent, or share your personal data with third parties for marketing purposes.</li>
              <li>Your payment information is securely processed; we do not store your credit card details on our servers.</li>
              <li>We use cookies to personalize your browsing experience and analyze site traffic.</li>
            </ul>
          </section>

          {/* Defective Items */}
          <section>
            <h2 className="text-xl text-velvet-white mb-4 uppercase tracking-wider">
              Defective or Incorrect Items
            </h2>
            <p>
              If you receive a defective or incorrect item, please contact our support team within 48 hours of delivery. Include your order number and clear photos of the issue. We will arrange a replacement or full refund at no additional cost to you.
            </p>
          </section>
          
          <section className="pt-8 border-t border-white/10">
            <p className="text-sm">
              For any policy-related inquiries or support, please contact us via WhatsApp or email.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  )
}
