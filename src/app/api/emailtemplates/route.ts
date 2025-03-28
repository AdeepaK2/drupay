import { NextRequest, NextResponse } from 'next/server';
import connect from '@/utils/db';
import EmailTemplate from '@/utils/models/emailTemplateSchema';

// Connect to database
async function connectDB() {
  try {
    await connect();
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
  }
}

// GET - Fetch email templates
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const templates = await EmailTemplate.find().sort({ name: 1 });
    
    return NextResponse.json({ 
      success: true, 
      templates 
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new email template
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'subject', 'message'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }
    
    // Check if template with same name exists
    const existingTemplate = await EmailTemplate.findOne({ name: body.name });
    if (existingTemplate) {
      return NextResponse.json({ error: 'Template with this name already exists' }, { status: 409 });
    }
    
    // Create new template
    const template = await EmailTemplate.create({
      name: body.name,
      subject: body.subject,
      message: body.message
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Template created successfully',
      template
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update existing template
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    // Get ID from query parameter instead of route parameter
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'subject', 'message'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }
    
    // Check if template exists
    const existingTemplate = await EmailTemplate.findById(id);
    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    // Update template
    const updatedTemplate = await EmailTemplate.findByIdAndUpdate(
      id,
      {
        name: body.name,
        subject: body.subject,
        message: body.message,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    return NextResponse.json({ 
      success: true, 
      message: 'Template updated successfully',
      template: updatedTemplate
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete template
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    // Get ID from query parameter instead of route parameter
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }
    
    // Check if template exists
    const existingTemplate = await EmailTemplate.findById(id);
    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    // Delete template
    await EmailTemplate.findByIdAndDelete(id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Template deleted successfully'
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}