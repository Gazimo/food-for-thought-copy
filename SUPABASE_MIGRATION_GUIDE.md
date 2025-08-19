# Supabase Image Storage Migration Guide

This guide covers migrating dish images from local storage to Supabase Storage.

## 🎯 Overview

Your app now uses **Supabase Storage** instead of local assets for dish images. This provides:

- **Scalability**: No size limits on your deployment
- **Performance**: Images served from CDN
- **Reliability**: Built-in backup and redundancy
- **Cost-effective**: Pay only for what you use

## 🔧 What Changed

### 1. DishImageService Updates

- ✅ Now uploads images directly to Supabase Storage
- ✅ Uses your `dish-images` bucket
- ✅ Maintains same MD5 filename pattern
- ✅ Returns Supabase public URLs

### 2. Next.js Configuration

- ✅ Added Supabase domain to `remotePatterns`
- ✅ Enables Next.js Image optimization for Supabase URLs

### 3. Database Schema

- ✅ `image_url` field now stores full Supabase URLs
- ✅ Backward compatible with existing data

## 📋 Prerequisites

Make sure you have these environment variables set:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

## 🚀 Migration Steps

### Step 1: Upload Existing Images

Run the migration script to upload all your existing local images to Supabase:

```bash
# Migrate all images to Supabase
npx ts-node scripts/migrate-images-to-supabase.ts migrate
```

### Step 2: Update Database URLs

Update your database records to use the new Supabase URLs:

```bash
# Update database to use Supabase URLs
npx ts-node scripts/migrate-images-to-supabase.ts update-db
```

### Step 3: Verify Migration

Check that everything worked correctly:

```bash
# Verify the migration
npx ts-node scripts/migrate-images-to-supabase.ts verify
```

### Step 4: Full Migration (All Steps)

Or run everything at once:

```bash
# Run complete migration process
npx ts-node scripts/migrate-images-to-supabase.ts full
```

## 🔍 Verification

After migration, verify:

1. **New images**: Generate a new dish and confirm the image appears
2. **Existing images**: Check that old dishes still show their images
3. **Database**: Confirm `image_url` fields now have Supabase URLs
4. **Performance**: Images should load faster from Supabase CDN

## 🎨 New Image Generation Flow

When you generate new dishes, the flow now:

1. 🎨 **Generate** image with DALL-E 3
2. ⬆️ **Upload** directly to Supabase Storage
3. 🔗 **Get** public URL from Supabase
4. 💾 **Save** Supabase URL to database

## 🧹 Cleanup (Optional)

Once you've verified everything works:

```bash
# Remove local images (ONLY after verification!)
rm -rf public/images/dishes/
```

⚠️ **WARNING**: Only delete local images after thoroughly testing that all images load correctly from Supabase!

## 🔧 Troubleshooting

### Images Not Loading

1. Check that your Supabase bucket is public
2. Verify environment variables are set
3. Confirm Next.js `remotePatterns` includes your Supabase domain

### Migration Fails

1. Check Supabase credentials
2. Ensure the `dish-images` bucket exists
3. Verify you have storage permissions

### Database Update Issues

1. Confirm your service role key has database write permissions
2. Check that dishes exist in the database

## 📊 Bucket Configuration

Your Supabase bucket should be configured as:

- **Name**: `dish-images`
- **Public**: ✅ Yes (for public access)
- **File size limit**: 50MB (default)
- **Allowed MIME types**: `image/*`

## 🚀 Benefits After Migration

- **Faster deploys**: No large image assets in your repo
- **Better performance**: Images served from CDN
- **Unlimited storage**: No deployment size limits
- **Automatic backups**: Supabase handles redundancy
- **Cost efficient**: Pay only for storage used

## 🔄 Future Image Additions

All new images will automatically:

- Upload to Supabase Storage
- Get optimized URLs
- Be served from CDN
- Work with Next.js Image component

The migration is complete! Your app now uses modern cloud storage for all dish images. 🎉
