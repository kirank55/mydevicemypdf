import { Link } from 'react-router-dom';

const sections = [
  {
    name: 'Organize & Manage',
    links: [
      { name: 'Merge PDF', to: '/merge-pdf' },
      { name: 'Split PDF', to: '/split-pdf' },
      { name: 'Remove Pages', to: '/remove-pages' },
      { name: 'Organize PDF', to: '/organize-pdf' },
      { name: 'Rotate PDF', to: '/rotate-pdf' },
    ],
  },
  {
    name: 'Optimize',
    links: [{ name: 'Compress PDF', to: '/compress-pdf' }],
  },
  {
    name: 'Convert',
    links: [
      { name: 'JPG to PDF', to: '/jpg-to-pdf' },
      { name: 'PDF to JPG', to: '/pdf-to-jpg' },
    ],
  },
  {
    name: 'Edit & Security',
    links: [
      { name: 'Add Page Numbers', to: '/add-pdf-page-number' },
      { name: 'Add Watermark', to: '/pdf-add-watermark' },
    ],
  },
];

export default function SitemapPage() {
  return (
    <section className="py-12">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-black tracking-tight">Sitemap</h1>
        <p className="text-gray-500 mt-2">
          Quick links to all tools. <Link to="/" className="underline">Back to home</Link>.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mt-10">
          {sections.map((section) => (
            <div key={section.name} className="bg-white border-4 border-black rounded-lg p-6">
              <h2 className="text-xl font-black">{section.name}</h2>
              <ul className="mt-4 space-y-2">
                {section.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="font-bold underline hover:no-underline">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
