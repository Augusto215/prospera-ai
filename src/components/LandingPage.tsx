import React from 'react';
import Header from './layout/Header';
import HeroSection from './landing/HeroSection';
import FeaturesSection from './landing/FeaturesSection';
import StatsSection from './landing/StatsSection';
import TestimonialsSection from './landing/TestimonialsSection';
import PricingSection from './landing/PricingSection';
import ModuleComparisonSection from './landing/ModuleComparisonSection';
import CTASection from './landing/CTASection';
import Footer from './landing/Footer';
import AuthModal from './auth/AuthModal';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <TestimonialsSection />
      <PricingSection />
      <ModuleComparisonSection />
      <CTASection />
      <Footer />
      <AuthModal />
    </div>
  );
}