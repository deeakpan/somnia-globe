'use client';

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { extractEventSignatures } from '@/lib/somnia-streams';
import { recalculateRankings } from '@/lib/supabase';

interface FormData {
  project_name: string;
  contract_address: string;
  category: string;
  abi: string;
  description: string;
  twitter?: string;
  discord?: string;
  website?: string;
  github?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

const CATEGORIES = [
  'defi',
  'gaming',
  'nft',
  'social',
  'infrastructure',
  'dao',
  'metaverse',
  'other',
];

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({
    project_name: '',
    contract_address: '',
    category: '',
    abi: '',
    description: '',
    twitter: '',
    discord: '',
    website: '',
    github: '',
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [abiValidation, setAbiValidation] = useState<{
    isValid: boolean;
    message: string;
    eventCount: number;
  }>({ isValid: false, message: '', eventCount: 0 });

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const configured = !!(url && key && url.includes('supabase.co') && key.length > 20);
    setIsConfigured(configured);
  }, []);

  const validateABI = (abiString: string): { isValid: boolean; message: string; eventCount: number; parsedAbi?: any } => {
    if (!abiString.trim()) {
      return { isValid: false, message: 'ABI is required', eventCount: 0 };
    }

    try {
      const parsed = JSON.parse(abiString);
      
      if (!Array.isArray(parsed)) {
        return { isValid: false, message: 'ABI must be a JSON array', eventCount: 0 };
      }

      const validTypes = ['function', 'event', 'constructor', 'fallback', 'receive', 'error'];
      let eventCount = 0;

      for (const item of parsed) {
        if (!item.type || !validTypes.includes(item.type)) {
          return { isValid: false, message: `Invalid ABI item type: ${item.type || 'undefined'}`, eventCount: 0 };
        }

        if (item.type === 'event') {
          eventCount++;
          if (!item.name) {
            return { isValid: false, message: 'Event items must have a name', eventCount: 0 };
          }
        }

        if (item.type === 'function' && !item.name && item.type !== 'constructor') {
          return { isValid: false, message: 'Function items must have a name', eventCount: 0 };
        }

        if (item.inputs && !Array.isArray(item.inputs)) {
          return { isValid: false, message: 'Inputs must be an array', eventCount: 0 };
        }

        if (item.outputs && !Array.isArray(item.outputs)) {
          return { isValid: false, message: 'Outputs must be an array', eventCount: 0 };
        }
      }

      if (eventCount === 0) {
        return { isValid: false, message: 'ABI must contain at least one event', eventCount: 0 };
      }

      return { isValid: true, message: `Valid ABI with ${eventCount} event(s)`, eventCount, parsedAbi: parsed };
    } catch (error) {
      return { isValid: false, message: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`, eventCount: 0 };
    }
  };

  const handleABIChange = (value: string) => {
    setFormData({ ...formData, abi: value });
    const validation = validateABI(value);
    setAbiValidation(validation);
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationError[] = [];

    if (!formData.project_name.trim()) {
      newErrors.push({ field: 'project_name', message: 'Project name is required' });
    }

    if (!formData.contract_address.trim()) {
      newErrors.push({ field: 'contract_address', message: 'Contract address is required' });
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.contract_address)) {
      newErrors.push({ field: 'contract_address', message: 'Invalid Ethereum address format' });
    }

    if (!formData.category) {
      newErrors.push({ field: 'category', message: 'Category is required' });
    }

    if (!abiValidation.isValid) {
      newErrors.push({ field: 'abi', message: abiValidation.message });
    }

    if (!formData.description.trim()) {
      newErrors.push({ field: 'description', message: 'Description is required' });
    }

    if (formData.twitter && !isValidUrl(formData.twitter)) {
      newErrors.push({ field: 'twitter', message: 'Invalid Twitter URL' });
    }

    if (formData.discord && !isValidUrl(formData.discord)) {
      newErrors.push({ field: 'discord', message: 'Invalid Discord URL' });
    }

    if (formData.github && !isValidUrl(formData.github)) {
      newErrors.push({ field: 'github', message: 'Invalid GitHub URL' });
    }

    // Website is required
    if (!formData.website || !formData.website.trim()) {
      newErrors.push({ field: 'website', message: 'Website is required' });
    } else if (!isValidUrl(formData.website)) {
      newErrors.push({ field: 'website', message: 'Invalid website URL' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedAbi = JSON.parse(formData.abi);
      const eventSignatures = extractEventSignatures(parsedAbi);

      const socials: any = {};
      if (formData.twitter) socials.twitter = formData.twitter;
      if (formData.discord) socials.discord = formData.discord;
      if (formData.website) socials.website = formData.website;
      if (formData.github) socials.github = formData.github;

      const { data, error } = await (supabase
        .from('projects') as any)
        .insert({
          project_name: formData.project_name.trim(),
          contract_address: formData.contract_address.toLowerCase().trim(),
          category: formData.category,
          abi: parsedAbi,
          event_signatures: eventSignatures,
          description: formData.description.trim(),
          socials: Object.keys(socials).length > 0 ? socials : null,
          unique_wallets: 0, // Will be set from RPC initial volume
          total_transactions: 0,
          initial_volume: 0, // TODO: Fetch from RPC (last 24h)
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          setErrors([{ field: 'contract_address', message: 'This contract address is already registered' }]);
        } else {
          setErrors([{ field: 'general', message: error.message }]);
        }
        setIsSubmitting(false);
        return;
      }

      // Recalculate rankings after successful registration
      try {
        await recalculateRankings();
      } catch (rankError) {
        console.error('Error recalculating rankings:', rankError);
        // Don't fail registration if ranking fails
      }

      setSuccess(true);
      setFormData({
        project_name: '',
        contract_address: '',
        category: '',
        abi: '',
        description: '',
        twitter: '',
        discord: '',
        website: '',
        github: '',
      });
      setAbiValidation({ isValid: false, message: '', eventCount: 0 });

      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      setErrors([{ field: 'general', message: error instanceof Error ? error.message : 'An error occurred' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getError = (field: string): string | undefined => {
    return errors.find(e => e.field === field)?.message;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1d] via-[#262629] to-[#1a1a1d]">
      <div className="max-w-5xl mx-auto px-6 py-20">
        
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl font-light text-white mb-3 tracking-tight">
            Register Project
          </h1>
          <div className="h-px bg-gradient-to-r from-white/20 via-white/5 to-transparent w-full rounded-full"></div>
          <p className="text-gray-400 mt-4 text-lg font-light">
            Submit your smart contract for event stream monitoring
          </p>
        </div>

        {/* Configuration Warning */}
        {!isConfigured && (
          <div className="mb-8 p-6 bg-gradient-to-r from-amber-500/5 to-transparent border-l-4 border-amber-500/50 rounded-r-2xl">
            <p className="text-amber-400 font-medium mb-2">Configuration Required</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Supabase environment variables are not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment file and restart the development server.
            </p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-8 p-6 bg-gradient-to-r from-emerald-500/5 to-transparent border-l-4 border-emerald-500/50 rounded-r-2xl">
            <p className="text-emerald-400 font-medium">Project registered successfully</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-10">
          
          {/* Project Information Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-light text-white/90 mb-6">Project Information</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Name */}
              <div className="space-y-2">
                <label htmlFor="project_name" className="block text-sm font-medium text-gray-300">
                  Project Name
                </label>
                <input
                  type="text"
                  id="project_name"
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-500 
                           focus:bg-white/[0.05] focus:border-white/20 focus:outline-none transition-all duration-200
                           hover:border-white/15"
                  placeholder="Enter project name"
                />
                {getError('project_name') && (
                  <p className="text-sm text-red-400/90">{getError('project_name')}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label htmlFor="category" className="block text-sm font-medium text-gray-300">
                  Category
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white
                           focus:bg-white/[0.05] focus:border-white/20 focus:outline-none transition-all duration-200
                           hover:border-white/15"
                >
                  <option value="" className="bg-[#1a1a1d]">Select category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#1a1a1d]">
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
                {getError('category') && (
                  <p className="text-sm text-red-400/90">{getError('category')}</p>
                )}
              </div>
            </div>

            {/* Contract Address */}
            <div className="space-y-2">
              <label htmlFor="contract_address" className="block text-sm font-medium text-gray-300">
                Contract Address
              </label>
              <input
                type="text"
                id="contract_address"
                value={formData.contract_address}
                onChange={(e) => setFormData({ ...formData, contract_address: e.target.value })}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-500 font-mono text-sm
                         focus:bg-white/[0.05] focus:border-white/20 focus:outline-none transition-all duration-200
                         hover:border-white/15"
                placeholder="0x..."
              />
              {getError('contract_address') && (
                <p className="text-sm text-red-400/90">{getError('contract_address')}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-500 resize-none
                         focus:bg-white/[0.05] focus:border-white/20 focus:outline-none transition-all duration-200
                         hover:border-white/15"
                placeholder="Describe your project and its primary use case"
              />
              {getError('description') && (
                <p className="text-sm text-red-400/90">{getError('description')}</p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full"></div>

          {/* Contract ABI Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-light text-white/90">Contract ABI</h2>
            <div className="space-y-2">
              <label htmlFor="abi" className="block text-sm font-medium text-gray-300">
                ABI JSON Array
              </label>
              <textarea
                id="abi"
                value={formData.abi}
                onChange={(e) => handleABIChange(e.target.value)}
                rows={14}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-500 font-mono text-xs resize-y
                         focus:bg-white/[0.05] focus:border-white/20 focus:outline-none transition-all duration-200
                         hover:border-white/15"
                placeholder='[{"type": "event", "name": "Transfer", "inputs": [...]}]'
              />
              {abiValidation.message && (
                <div className={`text-sm ${abiValidation.isValid ? 'text-emerald-400/90' : 'text-red-400/90'}`}>
                  {abiValidation.message}
                </div>
              )}
              {getError('abi') && (
                <p className="text-sm text-red-400/90">{getError('abi')}</p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full"></div>

          {/* Social Links Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-light text-white/90">Social Links</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="website" className="block text-sm font-medium text-gray-300">
                  Website <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-500
                           focus:bg-white/[0.05] focus:border-white/20 focus:outline-none transition-all duration-200
                           hover:border-white/15"
                  placeholder="https://yourproject.com"
                />
                {getError('website') && (
                  <p className="text-sm text-red-400/90">{getError('website')}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="twitter" className="block text-sm font-medium text-gray-300">
                  Twitter <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                </label>
                <input
                  type="url"
                  id="twitter"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-500
                           focus:bg-white/[0.05] focus:border-white/20 focus:outline-none transition-all duration-200
                           hover:border-white/15"
                  placeholder="https://twitter.com/yourproject"
                />
                {getError('twitter') && (
                  <p className="text-sm text-red-400/90">{getError('twitter')}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="discord" className="block text-sm font-medium text-gray-300">
                  Discord <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                </label>
                <input
                  type="url"
                  id="discord"
                  value={formData.discord}
                  onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-500
                           focus:bg-white/[0.05] focus:border-white/20 focus:outline-none transition-all duration-200
                           hover:border-white/15"
                  placeholder="https://discord.gg/yourserver"
                />
                {getError('discord') && (
                  <p className="text-sm text-red-400/90">{getError('discord')}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="github" className="block text-sm font-medium text-gray-300">
                  GitHub <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                </label>
                <input
                  type="url"
                  id="github"
                  value={formData.github}
                  onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-500
                           focus:bg-white/[0.05] focus:border-white/20 focus:outline-none transition-all duration-200
                           hover:border-white/15"
                  placeholder="https://github.com/yourproject"
                />
                {getError('github') && (
                  <p className="text-sm text-red-400/90">{getError('github')}</p>
                )}
              </div>
            </div>
          </div>

          {/* General Error */}
          {getError('general') && (
            <div className="p-6 bg-gradient-to-r from-red-500/5 to-transparent border-l-4 border-red-500/50 rounded-r-2xl">
              <p className="text-red-400">{getError('general')}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting || !isConfigured}
              className="w-full py-4 px-6 bg-white/10 border border-white/20 rounded-2xl text-white font-medium
                       hover:bg-white/15 hover:border-white/30 hover:shadow-lg hover:shadow-white/5
                       disabled:bg-white/5 disabled:border-white/10 disabled:text-gray-500 disabled:cursor-not-allowed
                       transition-all duration-200 relative overflow-hidden group"
            >
              <span className="relative z-10">
                {isSubmitting ? 'Submitting...' : !isConfigured ? 'Configure Supabase to Continue' : 'Submit Registration'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}