/**
 * Supabase Service
 * 
 * This service provides all CRUD operations for the Print Area Configuration system.
 * It handles:
 * - Product template management
 * - Print area configuration
 * - Template image uploads to Supabase Storage
 * - Admin authentication checks
 */

import { createClient } from '@supabase/supabase-js';
import { supabaseConfig, isMockAuth } from '../config/supabase';

// Initialize Supabase client
let supabase = null;

/**
 * Get or initialize Supabase client
 */
export const getSupabaseClient = () => {
  if (!supabase && !isMockAuth) {
    supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
  }
  return supabase;
};

/**
 * Check if user is admin
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} True if user is admin
 */
export const isUserAdmin = async (userId) => {
  if (isMockAuth) {
    // In mock mode, return true for testing
    return true;
  }

  if (!userId) return false;

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('auth.users')
      .select('raw_user_meta_data')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data?.raw_user_meta_data?.is_admin === true;
  } catch (error) {
    console.error('Error in isUserAdmin:', error);
    return false;
  }
};

/**
 * Get current user's admin status
 * @returns {Promise<boolean>} True if current user is admin
 */
export const isCurrentUserAdmin = async () => {
  if (isMockAuth) {
    return true;
  }

  try {
    const client = getSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) return false;
    
    return user.user_metadata?.is_admin === true || 
           user.raw_user_meta_data?.is_admin === true;
  } catch (error) {
    console.error('Error checking current user admin status:', error);
    return false;
  }
};

// =====================================================
// Product Template Operations
// =====================================================

/**
 * Get all product templates
 * @returns {Promise<Array>} Array of product templates
 */
export const getProductTemplates = async () => {
  if (isMockAuth) {
    // Return empty array in mock mode - data should come from products.json
    return [];
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('product_templates')
      .select(`
        *,
        print_areas (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching product templates:', error);
    throw error;
  }
};

/**
 * Get a single product template by product key
 * @param {string} productKey - Unique product key
 * @returns {Promise<Object|null>} Product template with print areas, or null if not found
 */
export const getProductTemplate = async (productKey) => {
  if (isMockAuth) {
    return null;
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('product_templates')
      .select(`
        *,
        print_areas (*)
      `)
      .eq('product_key', productKey)
      .single();

    if (error) {
      // If no rows found, return null instead of throwing
      if (error.code === 'PGRST116' || error.message.includes('no rows')) {
        console.log('[getProductTemplate] No template found for:', productKey);
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error fetching product template:', error);
    throw error;
  }
};

/**
 * Create a new product template
 * @param {Object} template - Product template data
 * @returns {Promise<Object>} Created template
 */
export const createProductTemplate = async (template) => {
  if (isMockAuth) {
    console.log('Mock mode: Would create product template:', template);
    return { id: 'mock-id', ...template };
  }

  try {
    const client = getSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await client
      .from('product_templates')
      .insert({
        product_key: template.productKey,
        name: template.name,
        template_url: template.templateUrl,
        colors: template.colors || [],
        base_price: template.basePrice || 0,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating product template:', error);
    throw error;
  }
};

/**
 * Update a product template
 * @param {string} productKey - Product key to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated template
 */
export const updateProductTemplate = async (productKey, updates) => {
  if (isMockAuth) {
    console.log('Mock mode: Would update product template:', productKey, updates);
    return { product_key: productKey, ...updates };
  }

  try {
    const client = getSupabaseClient();
    
    // Use upsert to handle both insert and update cases
    const { data, error } = await client
      .from('product_templates')
      .upsert({
        product_key: productKey,
        name: updates.name,
        template_url: updates.templateUrl,
        colors: updates.colors,
        base_price: updates.basePrice,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'product_key',
        ignoreDuplicates: false
      })
      .select();

    if (error) throw error;
    
    // Return the first item if array is returned, otherwise return data
    return Array.isArray(data) && data.length > 0 ? data[0] : data;
  } catch (error) {
    console.error('Error updating product template:', error);
    throw error;
  }
};

/**
 * Delete a product template
 * @param {string} productKey - Product key to delete
 * @returns {Promise<void>}
 */
export const deleteProductTemplate = async (productKey) => {
  if (isMockAuth) {
    console.log('Mock mode: Would delete product template:', productKey);
    return;
  }

  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from('product_templates')
      .delete()
      .eq('product_key', productKey);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting product template:', error);
    throw error;
  }
};

// =====================================================
// Print Area Operations
// =====================================================

/**
 * Get print areas for a product
 * @param {string} productTemplateId - Product template ID
 * @returns {Promise<Array>} Array of print areas
 */
export const getPrintAreas = async (productTemplateId) => {
  if (isMockAuth) {
    return [];
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('print_areas')
      .select('*')
      .eq('product_template_id', productTemplateId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching print areas:', error);
    throw error;
  }
};

/**
 * Create a print area
 * @param {string} productTemplateId - Product template ID
 * @param {Object} printArea - Print area data
 * @returns {Promise<Object>} Created print area
 */
export const createPrintArea = async (productTemplateId, printArea) => {
  if (isMockAuth) {
    console.log('Mock mode: Would create print area:', printArea);
    return { id: 'mock-id', product_template_id: productTemplateId, ...printArea };
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('print_areas')
      .insert({
        product_template_id: productTemplateId,
        area_key: printArea.areaKey,
        name: printArea.name,
        x: printArea.x,
        y: printArea.y,
        width: printArea.width,
        height: printArea.height,
        max_width: printArea.maxWidth,
        max_height: printArea.maxHeight
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating print area:', error);
    throw error;
  }
};

/**
 * Update a print area
 * @param {string} printAreaId - Print area ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated print area
 */
export const updatePrintArea = async (printAreaId, updates) => {
  if (isMockAuth) {
    console.log('Mock mode: Would update print area:', printAreaId, updates);
    return { id: printAreaId, ...updates };
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('print_areas')
      .update({
        name: updates.name,
        x: updates.x,
        y: updates.y,
        width: updates.width,
        height: updates.height,
        max_width: updates.maxWidth,
        max_height: updates.maxHeight
      })
      .eq('id', printAreaId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating print area:', error);
    throw error;
  }
};

/**
 * Delete a print area
 * @param {string} printAreaId - Print area ID
 * @returns {Promise<void>}
 */
export const deletePrintArea = async (printAreaId) => {
  if (isMockAuth) {
    console.log('Mock mode: Would delete print area:', printAreaId);
    return;
  }

  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from('print_areas')
      .delete()
      .eq('id', printAreaId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting print area:', error);
    throw error;
  }
};

/**
 * Batch update print areas for a product
 * @param {string} productTemplateId - Product template ID
 * @param {Object} printAreasConfig - Print areas configuration (key-value pairs)
 * @returns {Promise<Array>} Updated print areas
 */
export const batchUpdatePrintAreas = async (productTemplateId, printAreasConfig) => {
  if (isMockAuth) {
    console.log('Mock mode: Would batch update print areas:', printAreasConfig);
    return Object.entries(printAreasConfig).map(([key, area]) => ({
      id: `mock-${key}`,
      product_template_id: productTemplateId,
      area_key: key,
      ...area
    }));
  }

  try {
    const client = getSupabaseClient();
    
    // Get existing print areas
    const { data: existingAreas, error: fetchError } = await client
      .from('print_areas')
      .select('*')
      .eq('product_template_id', productTemplateId);

    if (fetchError) throw fetchError;

    const existingAreasMap = new Map(
      (existingAreas || []).map(area => [area.area_key, area])
    );

    // Delete areas that are no longer in the config FIRST
    const configKeys = new Set(Object.keys(printAreasConfig));
    const areasToDelete = Array.from(existingAreasMap.values())
      .filter(area => !configKeys.has(area.area_key))
      .map(area => area.id);

    if (areasToDelete.length > 0) {
      console.log('[batchUpdatePrintAreas] Deleting print areas:', areasToDelete);
      const { error: deleteError } = await client
        .from('print_areas')
        .delete()
        .in('id', areasToDelete);
      
      if (deleteError) {
        console.error('[batchUpdatePrintAreas] Error deleting print areas:', deleteError);
        throw deleteError;
      }
    }

    // Now update/insert areas
    const operations = [];

    // Process each print area in the config
    for (const [areaKey, areaData] of Object.entries(printAreasConfig)) {
      const existingArea = existingAreasMap.get(areaKey);

      if (existingArea) {
        // Update existing area
        operations.push(
          client
            .from('print_areas')
            .update({
              name: areaData.name,
              x: areaData.x,
              y: areaData.y,
              width: areaData.width,
              height: areaData.height,
              max_width: areaData.maxWidth,
              max_height: areaData.maxHeight
            })
            .eq('id', existingArea.id)
            .select()
        );
      } else {
        // Create new area
        operations.push(
          client
            .from('print_areas')
            .insert({
              product_template_id: productTemplateId,
              area_key: areaKey,
              name: areaData.name,
              x: areaData.x,
              y: areaData.y,
              width: areaData.width,
              height: areaData.height,
              max_width: areaData.maxWidth,
              max_height: areaData.maxHeight
            })
            .select()
        );
      }
    }

    // Execute all update/insert operations
    if (operations.length > 0) {
      const results = await Promise.all(operations);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('[batchUpdatePrintAreas] Errors in operations:', errors);
        throw errors[0].error;
      }

      // Return all updated/created areas
      const updatedAreas = results
        .filter(r => r.data)
        .flatMap(r => Array.isArray(r.data) ? r.data : [r.data])
        .filter(area => area != null); // Filter out null values

      return updatedAreas;
    }

    return [];
  } catch (error) {
    console.error('Error batch updating print areas:', error);
    throw error;
  }
};

// =====================================================
// Template Image Upload Operations
// =====================================================

/**
 * Upload a template image to Supabase Storage
 * @param {File} file - Image file to upload
 * @param {string} productKey - Product key for file naming
 * @returns {Promise<string>} Public URL of uploaded image
 */
export const uploadTemplateImage = async (file, productKey) => {
  if (isMockAuth) {
    console.log('Mock mode: Would upload template image:', file.name);
    return `/templates/${productKey}/template.png`;
  }

  try {
    const client = getSupabaseClient();
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${productKey}_${timestamp}.${fileExt}`;
    const filePath = `${productKey}/${fileName}`;

    // Upload to Supabase Storage
    const { error } = await client.storage
      .from('product-templates')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = client.storage
      .from('product-templates')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading template image:', error);
    throw error;
  }
};

/**
 * Delete a template image from Supabase Storage
 * @param {string} imageUrl - URL of image to delete
 * @returns {Promise<void>}
 */
export const deleteTemplateImage = async (imageUrl) => {
  if (isMockAuth) {
    console.log('Mock mode: Would delete template image:', imageUrl);
    return;
  }

  try {
    const client = getSupabaseClient();
    
    // Extract file path from URL
    const urlParts = imageUrl.split('/product-templates/');
    if (urlParts.length < 2) {
      throw new Error('Invalid template image URL');
    }
    
    const filePath = urlParts[1];

    const { error } = await client.storage
      .from('product-templates')
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting template image:', error);
    throw error;
  }
};

/**
 * Replace template image (delete old, upload new)
 * @param {string} oldImageUrl - URL of old image
 * @param {File} newFile - New image file
 * @param {string} productKey - Product key
 * @returns {Promise<string>} Public URL of new image
 */
export const replaceTemplateImage = async (oldImageUrl, newFile, productKey) => {
  if (isMockAuth) {
    console.log('Mock mode: Would replace template image');
    return `/templates/${productKey}/template.png`;
  }

  try {
    // Upload new image first
    const newUrl = await uploadTemplateImage(newFile, productKey);
    
    // Delete old image if it exists and is a Supabase URL
    if (oldImageUrl && oldImageUrl.includes('supabase')) {
      try {
        await deleteTemplateImage(oldImageUrl);
      } catch (error) {
        console.warn('Failed to delete old image:', error);
        // Don't throw - new image is already uploaded
      }
    }

    return newUrl;
  } catch (error) {
    console.error('Error replacing template image:', error);
    throw error;
  }
};

// =====================================================
// Complete Configuration Operations
// =====================================================

/**
 * Save complete product configuration (template + print areas)
 * @param {string} productKey - Product key
 * @param {Object} config - Complete configuration
 * @returns {Promise<Object>} Saved configuration
 */
export const saveProductConfiguration = async (productKey, config) => {
  if (isMockAuth) {
    console.log('Mock mode: Configuration saved! (in real app, this would save to Supabase)', {
      productKey,
      config
    });
    return { productKey, ...config };
  }

  try {
    // Get or create product template
    let template = await getProductTemplate(productKey);
    
    if (!template) {
      // Create new template
      template = await createProductTemplate({
        productKey,
        name: config.name,
        templateUrl: config.template,
        colors: config.colors,
        basePrice: config.basePrice
      });
    } else {
      // Update existing template
      template = await updateProductTemplate(productKey, {
        name: config.name,
        templateUrl: config.template,
        colors: config.colors,
        basePrice: config.basePrice
      });
    }

    // Batch update print areas
    if (config.printAreas) {
      await batchUpdatePrintAreas(template.id, config.printAreas);
    }

    // Return complete configuration
    return await getProductTemplate(productKey);
  } catch (error) {
    console.error('Error saving product configuration:', error);
    throw error;
  }
};

/**
 * Load complete product configuration from Supabase
 * @param {string} productKey - Product key
 * @returns {Promise<Object|null>} Product configuration or null if not found
 */
export const loadProductConfiguration = async (productKey) => {
  if (isMockAuth) {
    console.log('Mock mode: Would load configuration for:', productKey);
    return null;
  }

  try {
    const template = await getProductTemplate(productKey);
    
    if (!template) return null;

    // Convert print areas array to object format
    const printAreasObj = {};
    if (template.print_areas) {
      template.print_areas.forEach(area => {
        printAreasObj[area.area_key] = {
          name: area.name,
          x: area.x,
          y: area.y,
          width: area.width,
          height: area.height,
          maxWidth: area.max_width,
          maxHeight: area.max_height
        };
      });
    }

    return {
      name: template.name,
      template: template.template_url,
      printAreas: printAreasObj,
      colors: template.colors,
      basePrice: template.base_price
    };
  } catch (error) {
    console.error('Error loading product configuration:', error);
    throw error;
  }
};

export default {
  // Admin
  isUserAdmin,
  isCurrentUserAdmin,
  
  // Product Templates
  getProductTemplates,
  getProductTemplate,
  createProductTemplate,
  updateProductTemplate,
  deleteProductTemplate,
  
  // Print Areas
  getPrintAreas,
  createPrintArea,
  updatePrintArea,
  deletePrintArea,
  batchUpdatePrintAreas,
  
  // Template Images
  uploadTemplateImage,
  deleteTemplateImage,
  replaceTemplateImage,
  
  // Complete Configuration
  saveProductConfiguration,
  loadProductConfiguration
};
