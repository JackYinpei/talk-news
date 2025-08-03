'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/80 backdrop-blur-md fixed w-full z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-blue-400">Talk News</div>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">特性</a>
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">工作原理</a>
              <a href="#about" className="text-gray-300 hover:text-white transition-colors">关于</a>
            </nav>

            <div className="flex items-center space-x-4">
              <Link 
                href="/talk" 
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-medium transition-colors"
              >
                开始学习
              </Link>
              
              <button
                className="md:hidden text-gray-300 hover:text-white"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-800">
            <div className="px-4 py-2 space-y-1">
              <a href="#features" className="block px-3 py-2 text-gray-300 hover:text-white">特性</a>
              <a href="#how-it-works" className="block px-3 py-2 text-gray-300 hover:text-white">工作原理</a>
              <a href="#about" className="block px-3 py-2 text-gray-300 hover:text-white">关于</a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            通过
            <span className="text-blue-400 block">实时新闻</span>
            学习语言
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            将新闻阅读与AI对话相结合，在真实语境中提升你的外语能力。
            每一条新闻都是你的语言学习材料。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/talk" 
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-medium transition-all transform hover:scale-105"
            >
              立即开始学习
            </Link>
            <button 
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="border border-gray-600 hover:border-gray-400 text-white px-8 py-4 rounded-full text-lg font-medium transition-all"
            >
              了解更多
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">为什么选择 Talk News？</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-xl bg-gray-800 hover:bg-gray-750 transition-colors">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">双语新闻流</h3>
              <p className="text-gray-300">
                实时新闻内容，支持多种语言对照阅读，
                让你在真实语境中学习新词汇和表达方式。
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-gray-800 hover:bg-gray-750 transition-colors">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">AI 互动对话</h3>
              <p className="text-gray-300">
                基于所读新闻内容与AI进行对话练习，
                提升口语表达能力和语言理解水平。
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-gray-800 hover:bg-gray-750 transition-colors">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">个性化学习</h3>
              <p className="text-gray-300">
                根据你的母语和目标语言提供定制化内容，
                让学习更高效、更符合个人需求。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">三步开始你的语言学习之旅</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">选择语言</h3>
              <p className="text-gray-300">
                设置你的母语和想要学习的目标语言，
                系统将为你提供个性化的学习体验。
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">阅读新闻</h3>
              <p className="text-gray-300">
                浏览实时新闻内容，每篇文章都提供双语对照，
                帮助你理解和学习新的词汇表达。
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">实践对话</h3>
              <p className="text-gray-300">
                与AI助手讨论你所阅读的新闻内容，
                在真实对话中练习和巩固所学知识。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">准备好开始你的语言学习之旅了吗？</h2>
          <p className="text-xl mb-8 opacity-90">
            加入我们，通过最新新闻提升你的语言技能
          </p>
          <Link 
            href="/talk" 
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-full text-lg font-semibold transition-all transform hover:scale-105 inline-block"
          >
            立即开始免费学习
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="bg-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="text-2xl font-bold text-blue-400 mb-4">Talk News</div>
              <p className="text-gray-300 mb-4">
                通过实时新闻学习语言的创新平台。
                让每一天的新闻阅读都成为你语言学习的进步。
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">产品</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#features" className="hover:text-white transition-colors">功能特性</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">工作原理</a></li>
                <li><Link href="/talk" className="hover:text-white transition-colors">开始学习</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">技术栈</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Next.js</li>
                <li>React</li>
                <li>Tailwind CSS</li>
                <li>Google AI</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Talk News. 让学习语言变得更有趣。</p>
          </div>
        </div>
      </footer>
    </div>
  );
}