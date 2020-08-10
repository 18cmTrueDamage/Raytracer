var teapotVertexBuffer;
var teapotVertexNormalBuffer;
var teapotTriIndexBuffer;

function setupTeapotBuffers(raw_file_text){
	var vertices = [];
	var faces = [];
	count_vertices = 0;
	count_faces = 0;
	
	var lines = raw_file_text.split("\n");
	for (var line_num in lines){
		list_elements = lines[line_num].split(' ');
		
		if (list_elements[0] == 'v'){
			vertices.push(parseFloat(list_elements[1]));
			vertices.push(parseFloat(list_elements[2]));
			vertices.push(parseFloat(list_elements[3]));
			count_vertices += 1;
		}

		else if(list_elements[0] == 'f'){
			faces.push(parseInt(list_elements[2])-1);
			faces.push(parseInt(list_elements[3])-1);
			faces.push(parseInt(list_elements[4])-1);
			count_faces += 1;
		}
	}
	
	teapotVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	teapotVertexBuffer.numItems = count_vertices;
	
	var normals = [];
	for (var i=0; i < count_vertices; i++){
		normals.push(0);
		normals.push(0);
		normals.push(0);
	}

	calculateNormals(vertices, faces, count_faces, count_vertices, normals);
	

	teapotVertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    teapotVertexNormalBuffer.itemSize = 3;
    teapotVertexNormalBuffer.numItems = count_vertices;
	

    teapotTriIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotTriIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), gl.STATIC_DRAW);
	teapotTriIndexBuffer.numItems = count_faces;
	
	ready_to_draw = true;
}


function drawTeapot(){
	switchShaders(false);
	uploadViewDirToShader()
	
	gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
		
	gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);  

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotTriIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, count_faces * 3, gl.UNSIGNED_SHORT, 0);

	//console.log('draw_teapot');
}

function calculateNormals(vertices, faces, numT, numV, normals){
    var faceNormals = [];
    
    for (var i = 0; i < numT; i++){
        var v1 = faces[i*3];
        var v2 = faces[i*3 + 1];
        var v3 = faces[i*3 + 2];
        
        var vector1 = vec3.fromValues(vertices[3*v2]-vertices[3*v1], vertices[3*v2+1]-vertices[3*v1+1], vertices[3*v2+2]-vertices[3*v1+2]);
        var vector2 = vec3.fromValues(vertices[3*v3]-vertices[3*v1], vertices[3*v3+1]-vertices[3*v1+1], vertices[3*v3+2]-vertices[3*v1+2]);
        var normal = vec3.create();
        vec3.cross(normal, vector1, vector2);
		
        faceNormals.push(normal[0]);
        faceNormals.push(normal[1]);
        faceNormals.push(normal[2]);
    }
	    
    var count = []
    for (var i = 0; i < numV; i++)
        count.push(0);
    
    for (var i = 0; i < numT; i++){
        var v1 = faces[i*3 + 0]
        var v2 = faces[i*3 + 1]
        var v3 = faces[i*3 + 2]
        count[v1] += 1
        count[v2] += 1
        count[v3] += 1
        
        normals[3*v1 + 0] += faceNormals[i*3 + 0];
        normals[3*v1 + 1] += faceNormals[i*3 + 1];
        normals[3*v1 + 2] += faceNormals[i*3 + 2];
        
        normals[3*v2 + 0] += faceNormals[i*3 + 0];
        normals[3*v2 + 1] += faceNormals[i*3 + 1];
        normals[3*v2 + 2] += faceNormals[i*3 + 2];
        
        normals[3*v3 + 0] += faceNormals[i*3 + 0];
        normals[3*v3 + 1] += faceNormals[i*3 + 1];
        normals[3*v3 + 2] += faceNormals[i*3 + 2];
    }
	    
    for (var i = 0; i < numV; i++){
        normals[3*i+0] = normals[3*i+0]/count[i];
        normals[3*i+1] = normals[3*i+1]/count[i];
        normals[3*i+2] = normals[3*i+2]/count[i];
        
        var normal = vec3.fromValues(normals[i*3+0], normals[i*3+1], normals[i*3+2]);
        var normalized = vec3.create();
        vec3.normalize(normalized, normal);
        
        normals[i*3+0] = normalized[0];
        normals[i*3+1] = normalized[1];
        normals[i*3+2] = normalized[2];
    }
}