# Contentstack CMS Integration Setup

This guide will help you set up Contentstack CMS integration for dynamic header and footer content management.

## 🚀 Features

- **Dynamic Content Management**: Update header and footer content without code changes
- **Fallback Content**: Graceful degradation when CMS is unavailable
- **Real-time Updates**: Content changes reflect immediately
- **Environment Support**: Development, staging, and production environments

## 📋 Prerequisites

1. **Contentstack Account**: Sign up at [contentstack.com](https://www.contentstack.com/)
2. **Stack Created**: Create a new stack in your Contentstack organization
3. **Content Types**: Create `header` and `footer` content types
4. **API Credentials**: Get API key and delivery token

## ⚙️ Contentstack Setup

### 1. Create Content Types

#### Header Content Type
Create a content type called `header` with these fields:
- **title** (Single Line Textbox) - Main header title
- **subtitle** (Single Line Textbox) - Header subtitle
- **modal_title** (Single Line Textbox) - Settings modal title
- **modal_subtitle** (Single Line Textbox) - Settings modal subtitle
- **api_key_tooltip** (Single Line Textbox) - API key tooltip text
- **settings_aria_label** (Single Line Textbox) - Settings button aria label

#### Footer Content Type
Create a content type called `footer` with these fields:
- **main_title** (Single Line Textbox) - Footer main title
- **main_description** (Multi Line Textbox) - Footer description
- **features** (Multiple) - Feature list with:
  - **title** (Single Line Textbox)
  - **description** (Single Line Textbox)
- **information_title** (Single Line Textbox) - Information section title
- **information_items** (Multiple) - Information items with:
  - **label** (Single Line Textbox)
  - **value** (Single Line Textbox)
- **copyright** (Single Line Textbox) - Copyright text
- **status** (Single Line Textbox) - Status indicator

### 2. Environment Variables

Create a `.env.local` file in your project root:

```bash
# Contentstack CMS Configuration
NEXT_PUBLIC_CONTENTSTACK_API_KEY=your_contentstack_api_key_here
NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN=your_contentstack_delivery_token_here
NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT=development
NEXT_PUBLIC_CONTENTSTACK_REGION=us
```

### 3. Get API Credentials

1. Go to your Contentstack dashboard
2. Navigate to **Settings** → **Tokens**
3. Create a new **Delivery Token**
4. Copy the **API Key** and **Delivery Token**
5. Add them to your `.env.local` file

### 4. Configure Regions

Set the appropriate region based on your Contentstack data center:
- **us** - North America
- **eu** - Europe
- **azure-na** - Azure North America
- **azure-eu** - Azure Europe
- **gcp-na** - Google Cloud North America

## 🔧 Usage

### Testing Connection

The application includes a built-in connection test. Check the browser console for Contentstack status messages.

### Fallback Content

If Contentstack is unavailable, the application will use fallback content defined in `/src/lib/contentstack.js`.

### Content Updates

1. Log into your Contentstack dashboard
2. Edit the `header` or `footer` entries
3. Publish the changes
4. Refresh your application to see updates

## 🛠️ Development

### Local Development

1. Ensure environment variables are set in `.env.local`
2. Start the development server: `npm run dev`
3. Check browser console for Contentstack connection status

### Production Deployment

1. Add environment variables to your hosting platform
2. Ensure Contentstack environment is set to `production`
3. Verify content is published in Contentstack

## 🔍 Troubleshooting

### Common Issues

1. **Content not loading**: Check API key and delivery token
2. **Wrong environment**: Verify environment variable matches Contentstack
3. **Region mismatch**: Ensure region setting matches your data center
4. **Content not published**: Publish entries in Contentstack dashboard

### Debug Information

Check the browser console for detailed error messages and connection status.

## 📚 Content Structure Examples

### Header Content Example
```json
{
  "title": "Performance Dashboard",
  "subtitle": "Lighthouse CI & Web Vitals monitoring",
  "modal_title": "Performance Dashboard",
  "modal_subtitle": "Monitor Core Web Vitals & Lighthouse CI performance",
  "api_key_tooltip": "For Web Vitals monitoring via PageSpeed Insights",
  "settings_aria_label": "Open settings modal"
}
```

### Footer Content Example
```json
{
  "main_title": "Performance Dashboard",
  "main_description": "Monitor your website's Core Web Vitals and Lighthouse CI performance...",
  "features": [
    {
      "title": "Automated Lighthouse CI",
      "description": "GitHub Actions integration for continuous performance monitoring"
    }
  ],
  "information_title": "Information",
  "information_items": [
    {
      "label": "Lighthouse CI",
      "value": "GitHub Actions automation"
    }
  ],
  "copyright": "Built with Next.js, Lighthouse CI & GitHub Actions",
  "status": "Lighthouse CI enabled"
}
```

## 🎯 Next Steps

1. Set up your Contentstack account and stack
2. Create the content types as described above
3. Add your API credentials to environment variables
4. Create and publish your first header and footer entries
5. Test the integration in your local development environment

For more information, visit the [Contentstack Documentation](https://www.contentstack.com/docs/).
