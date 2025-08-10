'use client';

import { Heart, Github, Globe, Shield, Zap } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  // Test update for Lighthouse CI workflow

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-foreground">Web Vitals Monitor</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Monitor your website&apos;s Core Web Vitals in real-time. Track performance, 
              diagnose issues, and optimize user experience with actionable insights.
            </p>
            
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Key Features</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                <span>Real-time Core Web Vitals tracking</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                <span>Performance diagnosis & recommendations</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                <span>Automated alerts & notifications</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                <span>Historical data & trend analysis</span>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Information</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              
              <div className="flex items-center space-x-2">
                <Zap size={14} />
                <span>Powered by Google PageSpeed Insights</span>
              </div>
            </div>
            
            <div className="pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                This tool helps optimize Core Web Vitals based on Google&apos;s 
                performance standards and accessibility guidelines.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <p className="text-xs text-muted-foreground">
              © {currentYear} Web Vitals Monitor. Built with Next.js & Tailwind CSS.
            </p>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>Google Core Web Vitals compliant</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}