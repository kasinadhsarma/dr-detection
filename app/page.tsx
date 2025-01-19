import { Navigation } from '../components/Navigation';
import Link from 'next/link';
import { Shield, BarChart as Chart, Clock, Award, Users, FileText } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            Enterprise-Grade Diabetic Retinopathy Detection
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Empower your healthcare organization with AI-powered retinal analysis. Streamline screening workflows and improve patient outcomes with our clinically validated solution.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <Link href="/login" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10">
                Schedule Demo
              </Link>
            </div>
            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
              <Link href="/contact" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="mt-24">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">Enterprise Benefits</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: <Chart className="w-6 h-6 text-blue-600" />,
                title: "99.2% Accuracy",
                description: "Clinically validated results with high precision and recall rates."
              },
              {
                icon: <Clock className="w-6 h-6 text-blue-600" />,
                title: "Rapid Analysis",
                description: "Process hundreds of images per hour with real-time results."
              },
              {
                icon: <Shield className="w-6 h-6 text-blue-600" />,
                title: "HIPAA Compliant",
                description: "Enterprise-grade security with full HIPAA compliance."
              }
            ].map((benefit, index) => (
              <div key={index} className="bg-white shadow-lg rounded-lg p-6">
                <div className="flex items-center justify-center mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold text-center mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-center">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">Enterprise Features</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <Users className="w-6 h-6 text-blue-600" />,
                title: "Multi-user Access",
                description: "Role-based access control for enterprise teams"
              },
              {
                icon: <FileText className="w-6 h-6 text-blue-600" />,
                title: "Detailed Analytics",
                description: "Comprehensive reporting and data visualization"
              },
              {
                icon: <Award className="w-6 h-6 text-blue-600" />,
                title: "API Integration",
                description: "Easy integration with existing healthcare systems"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white shadow-lg rounded-lg p-6">
                <div className="flex items-center mb-4">
                  {feature.icon}
                  <h3 className="text-lg font-semibold ml-2">{feature.title}</h3>
                </div>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
