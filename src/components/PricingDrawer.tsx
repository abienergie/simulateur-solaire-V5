import React, { useState, useEffect } from 'react';
import { Battery, CreditCard, Clock, Zap, Shield, Coins, Wrench, Ticket, X } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useFinancialSettings } from '../../contexts/FinancialSettingsContext';
import { usePromoCode } from '../../hooks/usePromoCode';

interface PricingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  financingMode: 'cash' | 'subscription';
  basePrice: number;
  enphasePrice: number;
  batteryPrice: number;
  smartChargerPrice: number;
  myLightPrice: number;
  primeAutoconsommation: number;
  subscriptionPrice: number;
  duration: number;
  installedPower: number;
  connectionType?: string;
  batterySelection?: { 
    type: string | null;
    includeSmartCharger?: boolean;
  };
  mountingSystem: 'surimposition' | 'bac-lestes' | 'integration';
  mountingSystemCost: number;
  numberOfPanels: number;
}

export default function PricingDrawer({
  isOpen,
  onClose,
  financingMode,
  basePrice,
  enphasePrice,
  batteryPrice,
  smartChargerPrice,
  myLightPrice,
  primeAutoconsommation,
  subscriptionPrice,
  duration,
  installedPower,
  connectionType = 'surplus',
  batterySelection,
  mountingSystem,
  mountingSystemCost,
  numberOfPanels
}: PricingDrawerProps) {
  const { settings } = useFinancialSettings();
  const { 
    promoCodes,
    validPromoCodes,
    applyPromoCode, 
    clearPromoCodes,
    discount, 
    freeMonths, 
    freeDeposit, 
    freeBatterySetup
  } = usePromoCode(financingMode);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoCodeMessage, setPromoCodeMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [showSpecialCodes, setShowSpecialCodes] = useState(false);

  // Battery type checks
  const isMyBattery = batterySelection?.type === 'mybattery';
  const isSmartBattery = batterySelection?.type === 'virtual';
  
  // Setup fees
  const myBatteryFee = isMyBattery ? (freeBatterySetup ? 0 : 179) : 0;
  const smartBatteryFee = isSmartBattery ? 2000 : 0;
  const setupFees = myBatteryFee + smartBatteryFee;

  // Calculate totals
  const preTotalPrice = basePrice + enphasePrice + batteryPrice + smartChargerPrice + setupFees + mountingSystemCost - (connectionType === 'surplus' ? primeAutoconsommation : 0);
  const cashTotalPrice = financingMode === 'cash' 
    ? preTotalPrice - discount
    : 0;
  const monthlyTotal = subscriptionPrice + (myLightPrice / 12);
  // Calculate security deposit based on total monthly payment (subscription + MyLight)
  const securityDeposit = monthlyTotal * 2;

  // Calculate monthly MyLight/Battery cost even in cash mode
  const monthlyBatteryCost = isMyBattery 
    ? installedPower * 1.20 // MyBattery: 1.20€/kWc/month (TVA 20%)
    : isSmartBattery && batterySelection?.virtualCapacity 
      ? myLightPrice / 12 // Smart Battery: based on capacity
      : 0;

  // Show subsidy only in surplus mode
  const showSubsidy = connectionType === 'surplus';

  // Calculate monthly discount for subscription mode
  // Dividing by total months (duration * 12) instead of just 12
  const monthlyDiscount = discount / (duration * 12);

  // Save pricing data to localStorage for PDF generation
  useEffect(() => {
    // Save financial mode
    localStorage.setItem('financialMode', financingMode);
    
    // Save battery selection
    if (batterySelection) {
      localStorage.setItem('batterySelection', JSON.stringify(batterySelection));
    } else {
      localStorage.removeItem('batterySelection');
    }
    
    // Save inverter type
    localStorage.setItem('inverterType', enphasePrice > 0 ? 'enphase' : 'central');
    
    // Save mounting system
    localStorage.setItem('mountingSystem', mountingSystem);
    
    // Save other pricing components
    localStorage.setItem('basePrice', basePrice.toString());
    localStorage.setItem('enphasePrice', enphasePrice.toString());
    localStorage.setItem('batteryPrice', batteryPrice.toString());
    localStorage.setItem('smartChargerPrice', smartChargerPrice.toString());
    localStorage.setItem('myLightPrice', myLightPrice.toString());
    localStorage.setItem('setupFees', setupFees.toString());
    localStorage.setItem('mountingSystemCost', mountingSystemCost.toString());
    localStorage.setItem('subscriptionPrice', subscriptionPrice.toString());
    localStorage.setItem('subscriptionDuration', duration.toString());
  }, [
    financingMode, 
    batterySelection, 
    enphasePrice, 
    mountingSystem, 
    basePrice, 
    batteryPrice, 
    smartChargerPrice, 
    myLightPrice, 
    setupFees, 
    mountingSystemCost, 
    subscriptionPrice, 
    duration
  ]);

  // Clear promo codes when drawer is closed
  useEffect(() => {
    if (!isOpen) {
      setPromoCodeInput('');
    }
  }, [isOpen]);

  // Handle promo code application
  const handleApplyPromoCode = () => {
    if (promoCodeInput.trim() === '') {
      setPromoCodeMessage({
        type: 'error',
        message: 'Veuillez saisir un code promo'
      });
      return;
    }
    
    const result = applyPromoCode(promoCodeInput);
    if (result.success) {
      setPromoCodeMessage({
        type: 'success',
        message: `Code promo appliqué avec succès`
      });
      setPromoCodeInput('');
    } else {
      setPromoCodeMessage({
        type: 'error',
        message: result.message || 'Oups ! Ce code promo ne semble pas fonctionner'
      });
    }
  };

  // Remove a specific promo code
  const handleRemovePromoCode = (code: string) => {
    clearPromoCodes();
    setPromoCodeMessage({
      type: 'success',
      message: 'Code promo supprimé'
    });
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (promoCodeMessage) {
      const timer = setTimeout(() => {
        setPromoCodeMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [promoCodeMessage]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-96 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 bg-green-100 border-b border-green-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {financingMode === 'cash' ? 'Paiement comptant' : 'Abonnement'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Kit {installedPower.toFixed(1)} kWc
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-green-200 transition-colors"
              aria-label="Fermer"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-green-50">
            <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
              {financingMode === 'cash' ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-gray-900">Détail de votre installation</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Prix de base TTC</span>
                      <span className="font-medium">{formatCurrency(basePrice)}</span>
                    </div>

                    {enphasePrice > 0 && (
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Zap className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Option Enphase</span>
                        </div>
                        <span className="font-medium">{formatCurrency(enphasePrice)}</span>
                      </div>
                    )}

                    {mountingSystemCost > 0 && (
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Wrench className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            {mountingSystem === 'bac-lestes' ? 'Bac léstés' : 'Intégration (IAB)'}
                          </span>
                        </div>
                        <span className="font-medium">{formatCurrency(mountingSystemCost)}</span>
                      </div>
                    )}

                    {batteryPrice > 0 && (
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Battery className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Batterie physique</span>
                        </div>
                        <span className="font-medium">{formatCurrency(batteryPrice)}</span>
                      </div>
                    )}

                    {smartChargerPrice > 0 && (
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Zap className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Smart Charger</span>
                        </div>
                        <span className="font-medium">{formatCurrency(smartChargerPrice)}</span>
                      </div>
                    )}

                    {isMyBattery && (
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Battery className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Frais d'activation MyBattery</span>
                        </div>
                        {freeBatterySetup ? (
                          <span className="font-medium line-through">{formatCurrency(179)}</span>
                        ) : (
                          <span className="font-medium">{formatCurrency(179)}</span>
                        )}
                      </div>
                    )}

                    {isSmartBattery && (
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Battery className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Frais de mise en service SmartBattery</span>
                        </div>
                        <span className="font-medium">{formatCurrency(smartBatteryFee)}</span>
                      </div>
                    )}

                    {showSubsidy && primeAutoconsommation > 0 && (
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-green-500" />
                          <span className="text-green-600">Prime à l'autoconsommation</span>
                        </div>
                        <span className="font-medium text-green-600">-{formatCurrency(primeAutoconsommation)}</span>
                      </div>
                    )}
                    
                    {validPromoCodes.length > 0 && (
                      <div className="space-y-2">
                        {validPromoCodes.map(code => (
                          <div key={code.id} className="flex justify-between text-sm">
                            <div className="flex items-center gap-1">
                              <Ticket className="h-4 w-4 text-purple-500" />
                              <span className="text-purple-600">Code promo {code.code}</span>
                            </div>
                            {code.discount > 0 && (
                              <span className="font-medium text-purple-600">-{formatCurrency(code.discount)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex justify-between font-semibold">
                        <span>Total TTC</span>
                        <span className="text-blue-600">{formatCurrency(cashTotalPrice)}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-purple-500" />
                    <h3 className="font-semibold text-gray-900">Détail de votre abonnement</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Abonnement mensuel ({duration} ans)</span>
                      <span className="font-medium">{formatCurrency(subscriptionPrice)}</span>
                    </div>

                    {myLightPrice > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">MyLight (mensuel)</span>
                        <span className="font-medium">{formatCurrency(myLightPrice / 12)}</span>
                      </div>
                    )}

                    {showSubsidy && primeAutoconsommation > 0 && (
                      <div className="mt-3 bg-green-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Coins className="h-4 w-4 text-green-600" />
                          <h4 className="text-sm font-medium text-green-900">Prime à l'autoconsommation</h4>
                        </div>
                        <div className="flex justify-between text-sm text-green-800">
                          <span>Montant total</span>
                          <span className="font-medium">{formatCurrency(primeAutoconsommation)}</span>
                        </div>
                      </div>
                    )}
                    
                    {validPromoCodes.length > 0 && validPromoCodes.some(code => code.subscription_effect === 'free_months' && code.free_months && code.free_months > 0) && (
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Ticket className="h-4 w-4 text-purple-500" />
                          <span className="text-purple-600">
                            {validPromoCodes.find(c => c.subscription_effect === 'free_months')?.code}
                          </span>
                        </div>
                        <span className="font-medium text-purple-600">{freeMonths} mois offert{freeMonths > 1 ? 's' : ''}</span>
                      </div>
                    )}

                    <div className="mt-3 bg-amber-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-amber-600" />
                        <h4 className="text-sm font-medium text-amber-900">Caution</h4>
                      </div>
                      {freeDeposit ? (
                        <div className="flex justify-between text-sm text-amber-800">
                          <span className="line-through">Dépôt de garantie (2 mois)</span>
                          <span className="font-medium line-through">{formatCurrency(securityDeposit)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-sm text-amber-800">
                          <span>Dépôt de garantie (2 mois)</span>
                          <span className="font-medium">{formatCurrency(securityDeposit)}</span>
                        </div>
                      )}
                      {freeDeposit ? (
                        <p className="text-xs text-green-700 mt-1 font-medium">
                          Caution offerte avec le code {validPromoCodes.find(c => c.subscription_effect === 'free_deposit')?.code}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-700 mt-1">
                          Remboursable à la fin du contrat
                        </p>
                      )}
                    </div>

                    {isMyBattery && (
                      <div className="mt-3 bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Battery className="h-4 w-4 text-blue-600" />
                          <h4 className="text-sm font-medium text-blue-900">Frais d'activation MyBattery</h4>
                        </div>
                        {freeBatterySetup ? (
                          <div className="flex justify-between text-sm text-blue-800">
                            <span className="line-through">Frais unique de mise en service</span>
                            <span className="font-medium line-through">{formatCurrency(179)}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between text-sm text-blue-800">
                            <span>Frais unique de mise en service</span>
                            <span className="font-medium">{formatCurrency(179)}</span>
                          </div>
                        )}
                        {freeBatterySetup && (
                          <p className="text-xs text-green-700 mt-1 font-medium">
                            Frais d'activation offerts avec le code {validPromoCodes.find(c => c.subscription_effect === 'free_battery_setup')?.code}
                          </p>
                        )}
                      </div>
                    )}

                    {isSmartBattery && (
                      <div className="mt-3 bg-yellow-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Battery className="h-4 w-4 text-yellow-600" />
                          <h4 className="text-sm font-medium text-yellow-900">Frais de mise en service SmartBattery</h4>
                        </div>
                        <div className="flex justify-between text-sm text-yellow-800">
                          <span>Frais unique de mise en service</span>
                          <span className="font-medium">{formatCurrency(smartBatteryFee)}</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex justify-between font-semibold">
                        <span>Total mensuel TTC</span>
                        <span className="text-purple-600">{formatCurrency(monthlyTotal)}</span>
                      </div>
                      {freeMonths > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Les {freeMonths} premier{freeMonths > 1 ? 's' : ''} mois sont offert{freeMonths > 1 ? 's' : ''} avec le code {validPromoCodes.find(c => c.subscription_effect === 'free_months')?.code}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Code promo - Déplacé en dessous */}
            <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-purple-500" />
                  <h4 className="text-sm font-medium text-gray-900">Code promo</h4>
                </div>
                {validPromoCodes.length > 0 && (
                  <button
                    onClick={() => clearPromoCodes()}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Effacer tout
                  </button>
                )}
              </div>
              
              {/* Liste des codes promo appliqués */}
              {validPromoCodes.length > 0 && (
                <div className="mb-3 space-y-1">
                  {validPromoCodes.map(code => (
                    <div key={code.id} className="flex items-center justify-between bg-purple-50 px-3 py-1.5 rounded-md">
                      <div className="flex items-center gap-1.5">
                        <Ticket className="h-3.5 w-3.5 text-purple-500" />
                        <span className="text-sm font-medium text-purple-700">{code.code}</span>
                      </div>
                      <button
                        onClick={() => handleRemovePromoCode(code.code)}
                        className="text-purple-400 hover:text-purple-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  placeholder="Entrez votre code"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleApplyPromoCode}
                  className="px-3 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition-colors"
                >
                  Appliquer
                </button>
              </div>
              
              {promoCodeMessage && (
                <p className={`text-xs mt-1 ${promoCodeMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {promoCodeMessage.message}
                </p>
              )}
              
              {financingMode === 'subscription' && (
                <p className="text-xs mt-2 text-amber-600">
                  Seuls les codes promo spécifiques à l'abonnement sont acceptés
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}