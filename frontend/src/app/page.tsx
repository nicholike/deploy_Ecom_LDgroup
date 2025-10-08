'use client';

import React from 'react';
import Link from 'next/link';
import { Footer } from '@/components/layouts';

export default function HomePage() {
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome to MLM E-commerce
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Your multi-level marketing platform is ready. Choose where to go:
          </p>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <Link
              href="/dashboard"
              className="group block p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary"
            >
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-primary transition-colors">
                Dashboard
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your MLM network, track commissions, and view analytics
              </p>
            </Link>

            <Link
              href="/login"
              className="group block p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary"
            >
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-primary transition-colors">
                Login
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Sign in to access your account and start managing your business
              </p>
            </Link>
          </div>

          <div className="mt-16 text-sm text-gray-500 dark:text-gray-400">
            <p>Platform Status: <span className="text-green-500 font-semibold">● Active</span></p>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
