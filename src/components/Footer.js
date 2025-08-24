'use client';

import { useState, useEffect } from 'react';
import { Heart, Github, Globe, Shield, Zap } from 'lucide-react';
import { fetchFooterContent } from '@/lib/contentstack';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [footerContent, setFooterContent] = useState(null);
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  // Fetch footer content from Contentstack
  useEffect(() => {
    const loadFooterContent = async () => {
      try {
        setIsLoadingContent(true);
        const content = await fetchFooterContent();
        setFooterContent(content);
      } catch (error) {
        console.error('Failed to load footer content:', error);
        // Content will fallback to default values
      } finally {
        setIsLoadingContent(false);
      }
    };

    loadFooterContent();
  }, []);

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-foreground">{footerContent?.main_title || 'Performance Dashboard'}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {footerContent?.main_description || 'Comprehensive performance monitoring with Lighthouse CI automation and real-time Web Vitals tracking. GitHub Actions integration for continuous performance auditing.'}
            </p>
            
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Key Features</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {footerContent?.features ? footerContent.features.map((feature, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                  <span>{feature.title}</span>
                </li>
              )) : (
                <>
                  <li className="flex items-center space-x-2">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    <span>Automated Lighthouse CI via GitHub Actions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    <span>Real-time Web Vitals monitoring</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    <span>Workflow artifacts & historical tracking</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">{footerContent?.information_title || 'Information'}</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              {footerContent?.information_items ? footerContent.information_items.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Github size={14} />
                  <span>{item.label}: {item.value}</span>
                </div>
              )) : (
                <>
                  <div className="flex items-center space-x-2">
                    <Github size={14} />
                    <span>GitHub Actions Lighthouse CI</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap size={14} />
                    <span>Google PageSpeed Insights API</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Globe size={14} />
                    <span>Dual monitoring approach</span>
                  </div>
                </>
              )}
            </div>
            
            <div className="pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Dual monitoring approach: automated CI performance auditing 
                and manual Web Vitals tracking for comprehensive optimization.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <p className="text-xs text-muted-foreground">
              © {currentYear} {footerContent?.copyright || 'Built with Next.js, Lighthouse CI & GitHub Actions'}.
            </p>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>{footerContent?.status || 'Lighthouse CI enabled'}</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}