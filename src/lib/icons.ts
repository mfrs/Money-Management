import React from 'react';
import {
  Utensils, Car, Clapperboard, ShoppingBag, Bolt, Home, Heart,
  ShoppingCart, Banknote, Laptop, TrendingUp, TrendingDown,
  Landmark, Smartphone, Wallet, PiggyBank, Building2, Wifi,
  Music, Plane, CreditCard, History, Package, HelpCircle,
  GraduationCap, Dumbbell, Coffee, Gift, Briefcase, Globe
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  Utensils, Car, Clapperboard, ShoppingBag, Bolt, Home, Heart,
  ShoppingCart, Banknote, Laptop, TrendingUp, TrendingDown,
  Landmark, Smartphone, Wallet, PiggyBank, Building2, Wifi,
  Music, Plane, CreditCard, History, Package, HelpCircle,
  GraduationCap, Dumbbell, Coffee, Gift, Briefcase, Globe,
};

export function getIcon(name: string): React.ComponentType<any> {
  return iconMap[name] || HelpCircle;
}

export const availableIcons = Object.keys(iconMap);
