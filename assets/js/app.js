
let tipoDefault = "multichoice"; // valor inicial por defecto

// Toggle modo noche
document.getElementById("toggleNight").addEventListener("change", function(){
    document.body.classList.toggle("night", this.checked);
});



function scrollAlFinal(){
    const contenedor=document.getElementById("preguntas");
    contenedor.scrollTop=contenedor.scrollHeight;
}

// Helper to create input/textarea with mic
function crearInputConMicrofono(element, wrapper) {
    const inputWrapper = document.createElement("div");
    inputWrapper.className = "input-wrapper";
    
    // If element is textarea, we might need specific styles or handled by CSS
    
    const micBtn = document.createElement("button");
    micBtn.className = "mic-button";
    micBtn.innerHTML = "🎤"; 
    micBtn.title = "Dictar texto"; // Generic title
    
    setupVoiceInput(micBtn, element, wrapper);

    inputWrapper.appendChild(element);
    inputWrapper.appendChild(micBtn);
    
    return inputWrapper;
}

function crearOpcion(texto="",correcta=false){
    const div=document.createElement("div");
    div.className="opcion";

    const checkbox=document.createElement("input");
    checkbox.type="checkbox";
    checkbox.checked=correcta;
    checkbox.onchange=validarTodo;

    const input=document.createElement("input");
    input.type="text";
    input.placeholder="Texto de opción";
    input.value=texto;
    input.oninput=validarTodo;

    // Wrap input with mic
    // Note: wrapper for actualizarTitulo is null here as options don't update title directly usually
    // But if we wanted to pass the question wrapper we'd need to change signature. 
    // For now passing null is fine, setupVoiceInput handles it.
    const inputWithMic = crearInputConMicrofono(input, null);
    inputWithMic.style.flex = "1"; // Ensure it takes available space in flex container

    const btn=document.createElement("button");
    btn.textContent="X";
    btn.className="danger";
    btn.onclick=()=>{ div.remove(); validarTodo(); };

    div.appendChild(checkbox);
    div.appendChild(inputWithMic);
    div.appendChild(btn);

    return div;
}

function actualizarTitulo(wrapper,enunciado){
    const texto = enunciado.value.trim();
    const span = wrapper.querySelector(".pregunta-header span:first-child");

    // Limita a 50 caracteres + "…"
    const resumen = texto.length > 150 ? texto.substr(0,150) + "…" : texto;
    span.textContent = resumen !== "" ? resumen : "Pregunta";
}

function setupVoiceInput(btn, textarea, wrapper) {
    if (!('webkitSpeechRecognition' in window)) {
        btn.style.display = 'none';
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.continuous = true; // Allow pauses
    recognition.interimResults = false;
    recognition.lang = 'es-ES'; // Default to Spanish

    let recognizing = false;

    recognition.onstart = function() {
        recognizing = true;
        btn.classList.add('listening');
    };

    recognition.onend = function() {
        recognizing = false;
        btn.classList.remove('listening');
    };

    recognition.onresult = function(event) {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }
        
        if (finalTranscript) {
            // Insert at cursor position or append
            const startPos = textarea.selectionStart;
            const endPos = textarea.selectionEnd;
            const text = textarea.value;
            
            // Trim transcript to avoid double spaces if API returns them
            finalTranscript = finalTranscript.trim();
            
            // Capitalize if start of text or last non-whitespace char is ./!/?
            let i = startPos - 1;
            while (i >= 0 && /\s/.test(text[i])) i--;
            const lastChar = i >= 0 ? text[i] : null;

            if (lastChar === null || ['.', '!', '?'].includes(lastChar)) {
                 finalTranscript = finalTranscript.charAt(0).toUpperCase() + finalTranscript.slice(1);
            }
            
            // Add space if needed: only if previous char is not whitespace
            // AND the transcript itself doesn't already start with punctuation that shouldn't have a space (optional, but safe)
            const prefix = (startPos > 0 && !/\s/.test(text[startPos-1])) ? " " : "";
            
            const newText = text.substring(0, startPos) + 
                        prefix + finalTranscript + 
                        text.substring(endPos);
                        
            textarea.value = newText;
            
            // Move cursor to end of inserted text
            const newCursorPos = startPos + prefix.length + finalTranscript.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos); // Keep cursor at end of insertion

            // Trigger input event to update validtion and title
            textarea.dispatchEvent(new Event('input'));
            
            // Update title specifically if it's the main question text
            if(textarea.placeholder === "Enunciado") {
                 actualizarTitulo(wrapper, textarea);
            }
        }
    };

    recognition.onerror = function(event) {
        console.error("Speech recognition error", event.error);
        if (event.error !== 'no-speech') {
             btn.classList.remove('listening');
             recognizing = false;
        }
    };

    btn.onmousedown = function(e) {
        e.preventDefault(); // Prevent button from stealing focus
    };

    btn.onclick = function() {
        if (recognizing) {
            recognition.stop();
        } else {
            // If starting and cursor is at 0 but we have text, assume we want to append
            // This fixes the issue where clicking the button might have reset selection or user forgot to click end
            if (textarea.value.length > 0 && textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
                textarea.selectionStart = textarea.value.length;
                textarea.selectionEnd = textarea.value.length;
            }
            recognition.start();
        }
    };
}

function agregarPregunta(datos=null){
    const contenedor=document.getElementById("preguntas");

    const wrapper=document.createElement("div");
    wrapper.className="pregunta incompleta";

    const header=document.createElement("div");
    header.className="pregunta-header";
    header.innerHTML=`<span>Pregunta</span><span>▼</span>`;

    const body=document.createElement("div");
    body.className="pregunta-body";

    header.onclick=()=>{
        wrapper.classList.toggle("colapsada");
        header.querySelector("span:last-child").textContent =
            wrapper.classList.contains("colapsada") ? "▶" : "▼";
    };

    const filaSuperior=document.createElement("div");
    filaSuperior.className="fila-horizontal";

    const nombre=document.createElement("input");
    nombre.type="text";
    nombre.placeholder="Nombre interno (no visible para el alumno)";
    nombre.value=datos?.nombre||"";
    nombre.oninput=validarTodo;
    
    // Wrap nombre with mic
    const nombreWrapper = crearInputConMicrofono(nombre, null);
    nombreWrapper.style.flex = "2"; // Restore flex style from CSS rule .fila-horizontal input[type="text"]

    const tipoSelect=document.createElement("select");
    tipoSelect.innerHTML=`
        <option value="multichoice">Opción múltiple</option>
        <option value="essay">Ensayo</option>
    `;
    tipoSelect.value = datos?.tipo || tipoDefault;
    tipoSelect.style.height = "33px";
    tipoSelect.style.padding = "5px 10px";

    filaSuperior.appendChild(nombreWrapper);
    filaSuperior.appendChild(tipoSelect);

    const enunciado=document.createElement("textarea");
    enunciado.placeholder="Enunciado";
    enunciado.value=datos?.enunciado||"";
    enunciado.oninput=()=>{ actualizarTitulo(wrapper,enunciado); validarTodo(); };
    enunciado.style.height = "120px";

    const enunciadoWrapper = crearInputConMicrofono(enunciado, wrapper);

    const retro=document.createElement("textarea");
    retro.placeholder="Retroalimentación";
    retro.value=datos?.retro||"";
    
    // Wrap retro with mic
    const retroWrapper = crearInputConMicrofono(retro, null);

    const opcionesDiv=document.createElement("div");
    const essayDiv=document.createElement("div");
    essayDiv.style.display="none";

    /* CONFIGURACIÓN ESSAY EN FILA HORIZONTAL */
    const configDiv = document.createElement("div");
    configDiv.className = "essay-config";

    const campoPuntaje = document.createElement("div");
    campoPuntaje.className = "campo-essay";
    const labelPuntaje = document.createElement("label");
    labelPuntaje.textContent = "Puntaje:";
    const puntaje = document.createElement("input");
    puntaje.type = "number";
    puntaje.value = datos?.puntaje || 1;
    puntaje.min = 0.1;
    puntaje.step = 0.1;
    puntaje.oninput = validarTodo;
    labelPuntaje.appendChild(puntaje);
    campoPuntaje.appendChild(labelPuntaje);

    const campoLineas = document.createElement("div");
    campoLineas.className = "campo-essay";
    const labelLineas = document.createElement("label");
    labelLineas.textContent = "Líneas:";
    const lineas = document.createElement("input");
    lineas.type = "number";
    lineas.value = datos?.lineas || 15;
    labelLineas.appendChild(lineas);
    campoLineas.appendChild(labelLineas);

    const campoAdjuntos = document.createElement("div");
    campoAdjuntos.className = "campo-essay";
    const labelAdjuntos = document.createElement("label");
    labelAdjuntos.textContent = "Adjuntos:";
    const adjuntos = document.createElement("input");
    adjuntos.type = "number";
    adjuntos.value = datos?.adjuntos || 0;
    labelAdjuntos.appendChild(adjuntos);
    campoAdjuntos.appendChild(labelAdjuntos);

    configDiv.appendChild(campoPuntaje);
    configDiv.appendChild(campoLineas);
    configDiv.appendChild(campoAdjuntos);

    const graderinfo=document.createElement("textarea");
    graderinfo.placeholder="Información para el corrector";
    graderinfo.value=datos?.graderinfo||"";
    
    const graderinfoWrapper = crearInputConMicrofono(graderinfo, null);

    essayDiv.appendChild(configDiv);
    essayDiv.appendChild(graderinfoWrapper);

    if(datos?.opciones){
        datos.opciones.forEach(o=>{
            opcionesDiv.appendChild(crearOpcion(o.texto,o.correcta));
        });
    }else{
        opcionesDiv.appendChild(crearOpcion());
        opcionesDiv.appendChild(crearOpcion());
    }

    const btnAdd=document.createElement("button");
    btnAdd.textContent="Agregar opción";
    btnAdd.className="secondary";
    btnAdd.onclick = () => {
    const nuevaOpcion = crearOpcion();
    opcionesDiv.appendChild(nuevaOpcion);
    nuevaOpcion.querySelector('input[type="text"]').focus();
};

    tipoSelect.onchange=()=>{
        tipoDefault = tipoSelect.value;
        
        if(tipoSelect.value==="essay"){
            opcionesDiv.innerHTML="";
            opcionesDiv.style.display="none";
            btnAdd.style.display="none";
            essayDiv.style.display="block";
        }else{
            essayDiv.style.display="none";
            opcionesDiv.style.display="block";
            btnAdd.style.display="inline-block";
            if(opcionesDiv.children.length<2){
                opcionesDiv.appendChild(crearOpcion());
                opcionesDiv.appendChild(crearOpcion());
            }
        }
        validarTodo();
    };

    if(tipoSelect.value==="essay"){
        tipoSelect.onchange();
    }

    const botonesDiv=document.createElement("div");
    botonesDiv.className="pregunta-buttons";

    const btnDuplicar=document.createElement("button");
    btnDuplicar.textContent="Duplicar";
    btnDuplicar.className="primary";
    btnDuplicar.onclick=()=>{
        const datos=extraerDatos(wrapper);
        agregarPregunta(datos);
    };

    const btnEliminar=document.createElement("button");
    btnEliminar.textContent="Eliminar";
    btnEliminar.className="danger";
    btnEliminar.onclick=()=>{wrapper.remove(); validarTodo();};

    botonesDiv.appendChild(btnDuplicar);
    botonesDiv.appendChild(btnEliminar);

    body.appendChild(filaSuperior);
    body.appendChild(filaSuperior);
    body.appendChild(enunciadoWrapper);
    body.appendChild(retroWrapper);
    body.appendChild(opcionesDiv);
    body.appendChild(btnAdd);
    body.appendChild(essayDiv);
    body.appendChild(botonesDiv);

    wrapper.appendChild(header);
    wrapper.appendChild(body);

    contenedor.appendChild(wrapper);

    actualizarTitulo(wrapper, enunciado); // ✅ Actualiza resumen
    enunciado.focus();
    scrollAlFinal();
    validarTodo();

    return wrapper; // devuelve wrapper para usar en cargarXML
}

function extraerDatos(wrapper){
    const tipo=wrapper.querySelector("select").value;
    const textareas=wrapper.querySelectorAll("textarea");

    const nombre=wrapper.querySelector("input[type='text']").value;
    const enunciado=textareas[0].value;
    const retro=textareas[1].value;

    const data={tipo,nombre,enunciado,retro};

    if(tipo==="multichoice"){
        const opciones=[];
        wrapper.querySelectorAll(".opcion").forEach(o=>{
            opciones.push({
                texto:o.querySelector("input[type=text]").value,
                correcta:o.querySelector("input[type=checkbox]").checked
            });
        });
        data.opciones=opciones;
    }else{
        const inputs=wrapper.querySelectorAll(".essay-config input[type=number]");
        data.puntaje=parseFloat(inputs[0].value)||1;
        data.lineas=parseInt(inputs[1].value)||15;
        data.adjuntos=parseInt(inputs[2].value)||0;
        data.graderinfo=textareas[2]?.value||"";
    }

    return data;
}

function validarPregunta(wrapper){
    const data=extraerDatos(wrapper);

    if(data.tipo==="essay"){
        return data.enunciado.trim()!=="" && data.puntaje>0;
    }

    const opciones=data.opciones;
    let validas=0;
    let correcta=false;

    opciones.forEach(o=>{
        if(o.texto.trim()!=="") validas++;
        if(o.correcta && o.texto.trim()!=="") correcta=true;
    });

    return data.enunciado.trim()!=="" && validas>=2 && correcta;
}

function validarTodo(){
    const preguntas=document.querySelectorAll(".pregunta");
    let completas=0;
    let incompletas=0;

    preguntas.forEach(p=>{
        if(validarPregunta(p)){
            completas++;
            p.classList.add("completa");
            p.classList.remove("incompleta");
        }else{
            incompletas++;
            p.classList.add("incompleta");
            p.classList.remove("completa");
        }
    });

    document.getElementById("contador").textContent=
        `Completas: ${completas} | Incompletas: ${incompletas}`;

    document.getElementById("btnDescargar").disabled=
        incompletas>0 || preguntas.length===0;
}

function resetFormulario(){
    if(confirm("Se perderá todo el contenido actual. ¿Continuar?")){
        document.getElementById("preguntas").innerHTML="";
        validarTodo();
    }
}

function cargarXML(event){
    const file=event.target.files[0];
    if(!file) return;

    if(!confirm("Se reemplazará el contenido actual. ¿Continuar?")){
        event.target.value="";
        return;
    }

    const reader=new FileReader();
    reader.onload=function(e){
        const parser=new DOMParser();
        const xmlDoc=parser.parseFromString(e.target.result,"text/xml");

        document.getElementById("preguntas").innerHTML="";

        xmlDoc.querySelectorAll("question").forEach(q=>{
            const tipo=q.getAttribute("type")||"multichoice";
            const nombre=q.querySelector("name text")?.textContent||"";
            const enunciado=q.querySelector("questiontext text")?.textContent||"";
            const retro=q.querySelector("generalfeedback text")?.textContent||"";

            let wrapper;

            if(tipo==="essay"){
                wrapper = agregarPregunta({
                    tipo:"essay",
                    nombre,
                    enunciado,
                    retro,
                    puntaje:parseFloat(q.querySelector("defaultgrade")?.textContent)||1,
                    lineas:parseInt(q.querySelector("responsefieldlines")?.textContent)||15,
                    adjuntos:parseInt(q.querySelector("attachments")?.textContent)||0,
                    graderinfo:q.querySelector("graderinfo text")?.textContent||""
                });
            }else{
                const opciones=[];
                q.querySelectorAll("answer").forEach(a=>{
                    opciones.push({
                        texto:a.querySelector("text").textContent,
                        correcta:a.getAttribute("fraction")==100
                    });
                });

                wrapper = agregarPregunta({tipo:"multichoice",nombre,enunciado,retro,opciones});
            }

            // Actualiza resumen visible
            const textarea = wrapper.querySelector("textarea");
            actualizarTitulo(wrapper, textarea);
        });

        validarTodo();
    };

    reader.readAsText(file);
    event.target.value="";
}

function descargarXML(){
    let xml='<?xml version="1.0" encoding="UTF-8"?><quiz>';

    document.querySelectorAll(".pregunta").forEach(p=>{
        const data=extraerDatos(p);

        if(data.tipo==="essay"){
            xml+=`<question type="essay">`;
            xml+=`<name><text>${data.nombre}</text></name>`;
            xml+=`<questiontext format="html"><text><![CDATA[${data.enunciado}]]></text></questiontext>`;
            xml+=`<defaultgrade>${data.puntaje}</defaultgrade>`;
            xml+=`<responseformat>editor</responseformat>`;
            xml+=`<responsefieldlines>${data.lineas}</responsefieldlines>`;
            xml+=`<attachments>${data.adjuntos}</attachments>`;
            xml+=`<attachmentsrequired>0</attachmentsrequired>`;
            xml+=`<graderinfo format="html"><text><![CDATA[${data.graderinfo}]]></text></graderinfo>`;
            xml+=`<generalfeedback format="html"><text><![CDATA[${data.retro}]]></text></generalfeedback>`;
            xml+=`</question>`;
        }else{
            xml+=`<question type="multichoice">`;
            xml+=`<name><text>${data.nombre}</text></name>`;
            xml+=`<questiontext format="html"><text><![CDATA[${data.enunciado}]]></text></questiontext>`;
            xml+=`<generalfeedback><text><![CDATA[${data.retro}]]></text></generalfeedback>`;
            xml+=`<single>false</single>`;

            data.opciones.forEach(o=>{
                xml+=`<answer fraction="${o.correcta?100:0}"><text><![CDATA[${o.texto}]]></text></answer>`;
            });

            xml+=`</question>`;
        }
    });

    xml+="</quiz>";

    const blob=new Blob([xml],{type:"text/xml"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="preguntas.xml";
    a.click();
}





