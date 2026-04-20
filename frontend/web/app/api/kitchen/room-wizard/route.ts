import { NextResponse } from 'next/server';
import { getGenerativeModel } from '@/app/kitchen-designer/lib/gemini-integration';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { room, doors, windows } = body;

    if (!room || !doors || !windows) {
      return NextResponse.json(
        { error: 'Missing required fields: room, doors, or windows' },
        { status: 400 }
      );
    }

    const roomArea = (room.length * room.width) / 10000;

    const prompt = `You are an expert kitchen designer AI. Analyze this room and generate 3 optimal kitchen layouts.

ROOM DATA:
- Dimensions: ${room.length}cm × ${room.width}cm × ${room.height}cm (Area: ${roomArea.toFixed(2)}m²)
- Doors: ${doors.length} door(s)
- Windows: ${windows.length} window(s)

DOOR POSITIONS:
${JSON.stringify(doors, null, 2)}

WINDOW POSITIONS:
${JSON.stringify(windows, null, 2)}

DESIGN REQUIREMENTS:
1. Generate exactly 3 layouts: U-Shape, L-Shape, and Straight
2. Follow kitchen work triangle principles (4-6.5m perimeter)
3. Safety: Stove must be away from windows (minimum 30cm)
4. Convenience: Sink should be near window for natural light and drainage
5. Efficiency: Fridge should be near entry point
6. Workflow: Minimum 1m counter space on each side of stove
7. Standards: Use standard cabinet sizes (base: 60cm depth, wall: 35cm depth)
8. Clearance: Minimum 120cm walkway space

LAYOUT REQUIREMENTS:
- Each layout must include: base cabinets, wall cabinets, sink, stove, fridge
- Cabinet positions should be in centimeters from room origin (0,0)
- Rotation is in degrees (0, 90, 180, 270)
- All cabinets should be aligned to walls
- Consider door and window positions for placement

SCORING:
- Triangle Score: How well the work triangle is formed (0-100)
- Efficiency: How well space is utilized (0-100)

RESPONSE FORMAT:
Return ONLY a JSON object with this structure:
{
    "layouts": [
        {
            "id": "A",
            "name": "U-Shape Layout",
            "description": "Maximum storage and counter space",
            "cabinets": [
                {
                    "type": "base",
                    "x": 50,
                    "y": 50,
                    "width": 60,
                    "depth": 60,
                    "rotation": 0
                }
            ],
            "triangle_score": 95,
            "efficiency": 88
        }
    ]
}

IMPORTANT: 
- Return ONLY the JSON, no explanations
- Ensure all positions are within room boundaries
- Make layouts practical and buildable
- Consider standard appliance sizes (sink: 80-90cm, stove: 60cm, fridge: 60cm)
`;

    const model = getGenerativeModel();
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Attempt to parse JSON from response. 
    // Sometimes Gemini returns markdown code blocks, so we strip them if present.
    const jsonString = responseText.replace(/```json\n|\n```/g, '').trim();
    const parsedData = JSON.parse(jsonString);

    // Map properties from snake_case to camelCase since the frontend expects camelCase 
    // for triangleScore and efficiency (e.g. from existing python implementation expectations)
    // Actually, looking at room.store.ts, it expects `triangleScore` but the prompt says 
    // `triangle_score`. We will transform it to be safe.
    
    const layouts = (parsedData.layouts || []).map((layout: any) => {
      // Create walls based on room bounds
      const walls = [
        { start: { x: 0, z: 0 }, end: { x: room.length, z: 0 }, thickness: 150, height: room.height },
        { start: { x: room.length, z: 0 }, end: { x: room.length, z: room.width }, thickness: 150, height: room.height },
        { start: { x: room.length, z: room.width }, end: { x: 0, z: room.width }, thickness: 150, height: room.height },
        { start: { x: 0, z: room.width }, end: { x: 0, z: 0 }, thickness: 150, height: room.height },
      ];

      return {
        id: layout.id,
        name: layout.name,
        description: layout.description,
        cabinets: layout.cabinets || [],
        triangleScore: layout.triangle_score || layout.triangleScore || 0,
        efficiency: layout.efficiency || 0,
        walls: walls
      };
    });

    return NextResponse.json({ layouts });
  } catch (error: any) {
    console.error('Error generating kitchen layout:', error);
    return NextResponse.json(
      { error: 'Failed to generate layout' },
      { status: 500 }
    );
  }
}
