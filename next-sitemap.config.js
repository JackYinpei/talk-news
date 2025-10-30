const siteUrl = process.env.SITE_URL || 'https://lingdaily.yasobi.xyz';

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl,
  generateRobotsTxt: true,
  exclude: ['/api/*'],
  additionalPaths: async (config) => {
    const routes = ['/', '/talk', '/history', '/sign-in', '/sign-up'];
    return Promise.all(routes.map((route) => config.transform(config, route)));
  },
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  },
};
