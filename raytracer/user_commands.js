var origUp = vec3.fromValues(0.0, 1.0, 0.0);
var origEyePt = vec3.fromValues(0.0,0.0,10.0);

function quatRotation(rotationRate, rotAxis){

    var tempQuat = quat.create();
    quat.setAxisAngle(tempQuat, rotAxis, rotationRate);
    quat.normalize(tempQuat, tempQuat);
    
    quat.multiply(globalQuat, tempQuat, globalQuat);
    quat.normalize(globalQuat, globalQuat);
}

function handleKeyDown(event){
    if (event.keyCode == 37){
        quatRotation(-0.05, origUp);
        
        vec3.transformQuat(eyePt, origEyePt, globalQuat);
		vec3.normalize(viewDir, eyePt);
		vec3.scale(viewDir, viewDir, -1);
    }
    else if (event.keyCode == 39){
        quatRotation(0.05, origUp);
        
        vec3.transformQuat(eyePt, origEyePt, globalQuat);
		vec3.normalize(viewDir, eyePt);
		vec3.scale(viewDir, viewDir, -1);
    }
	else if (event.keyCode == 38){
		modelYRotationRadians += 0.05;
	}
	else if (event.keyCode == 40){
		modelYRotationRadians -= 0.05;
	}
}

