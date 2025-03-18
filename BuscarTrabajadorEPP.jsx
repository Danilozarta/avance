import React, { useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const BuscarTrabajadorEPP = () => {
    const [cedula, setCedula] = useState("");
    const [trabajador, setTrabajador] = useState(null);
    const [entregas, setEntregas] = useState([]);

    // Función para buscar al trabajador y sus entregas
    const handleBuscarTrabajador = async () => {
        try {
            // Buscar al trabajador por cédula
            const responseTrabajador = await fetch(
                `http://localhost:4000/api/epp/buscar-trabajador/${cedula}`
            );
            const dataTrabajador = await responseTrabajador.json();
            console.log("Datos del trabajador:", dataTrabajador); // Depuración

            if (dataTrabajador.success) {
                setTrabajador(dataTrabajador.trabajador);

                // Buscar las entregas relacionadas al trabajador
                const responseEntregas = await fetch(
                    `http://localhost:4000/api/epp/entregas-por-trabajador/${dataTrabajador.trabajador._id}`
                );
                const dataEntregas = await responseEntregas.json();

                if (dataEntregas.success) {
                    setEntregas(dataEntregas.entregas);
                } else {
                    Swal.fire("Error", "No se encontraron entregas para este trabajador", "error");
                }
            } else {
                Swal.fire("Error", "Trabajador no encontrado", "error");
            }
        } catch (error) {
            console.error("Error al buscar el trabajador:", error);
            Swal.fire("Error", "Hubo un problema al buscar el trabajador", "error");
        }
        console.log("Datos de las entregas:", entregas);
    };

    // Función para descargar todas las listas en PDF
    const handleDescargarPDF = async () => {
        if (!trabajador || entregas.length === 0) {
            Swal.fire("Error", "No hay datos para descargar", "error");
            return;
        }

        // Ocultar elementos no deseados
        const searchBar = document.querySelector(".epp-search");
        const title = document.querySelector(".epp-title");
        const buttons = document.querySelectorAll(".epp-button");

        if (searchBar) searchBar.style.display = "none"; // Ocultar la barra de búsqueda
        if (title) title.style.display = "none"; // Ocultar el título
        buttons.forEach((button) => {
            button.style.display = "none"; // Ocultar los botones
        });

        // Crear un encabezado personalizado (solo el título)
        const header = document.createElement("div");
        header.innerHTML = `
            <h1 style="text-align: center; font-size: 24px; margin-bottom: 20px;">COMPROBANTES DE ENTREGAS EPP UNIPALMA</h1>
        `;
        header.style.textAlign = "center";
        header.style.marginBottom = "20px";

        // Insertar el encabezado antes de la lista
        const container = document.querySelector(".epp-container");
        if (container) {
            container.insertBefore(header, container.firstChild); // Agregar el encabezado al inicio
        }

        // Esperar a que el encabezado se renderice completamente
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Capturar el contenido completo del contenedor
        const canvas = await html2canvas(container, {
            scale: 2, // Aumentar la calidad de la imagen
            useCORS: true, // Permitir imágenes externas
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4"); // Orientación portrait, unidades en mm, tamaño A4
        const pageWidth = pdf.internal.pageSize.getWidth(); // Ancho de una página A4
        const pageHeight = pdf.internal.pageSize.getHeight(); // Altura de una página A4

        const imgWidth = pageWidth; // Ancho de la imagen en el PDF
        const imgHeight = (canvas.height * imgWidth) / canvas.width; // Altura de la imagen en el PDF

        let positionY = 0; // Posición vertical actual en el PDF

        // Dividir la imagen en páginas si es más larga que una página A4
        if (imgHeight > pageHeight) {
            let remainingHeight = imgHeight; // Altura restante de la imagen
            let currentPage = 0; // Página actual

            while (remainingHeight > 0) {
                if (currentPage > 0) {
                    pdf.addPage(); // Agregar una nueva página
                }

                // Calcular la altura de la porción de la imagen que cabe en la página actual
                const portionHeight = Math.min(remainingHeight, pageHeight);

                // Agregar la porción de la imagen al PDF
                pdf.addImage(
                    imgData,
                    "PNG",
                    0, // Posición X
                    -positionY, // Posición Y (negativa para desplazar la imagen)
                    imgWidth,
                    imgHeight
                );

                // Actualizar la posición vertical y la altura restante
                positionY += portionHeight;
                remainingHeight -= portionHeight;
                currentPage++;
            }
        } else {
            // Si la imagen cabe en una sola página, agregarla directamente
            pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        }

        // Descargar el PDF
        pdf.save(`comprobante_entregas_epp_${trabajador.cedula}.pdf`);

        // Restaurar los elementos ocultos después de la descarga
        if (searchBar) searchBar.style.display = "block"; // Restaurar la barra de búsqueda
        if (title) title.style.display = "block"; // Restaurar el título
        buttons.forEach((button) => {
            button.style.display = "block"; // Restaurar visibilidad de los botones
        });

        // Eliminar el encabezado personalizado
        if (header && container) {
            container.removeChild(header);
        }
    };

    return (
        <div className="body-epp">
            {/* Menú de navegación */}
            <nav className="nav-registro">
                <div className="hamburger-registro" id="hamburger-registro">
                    <div className="line line1"></div>
                    <div className="line line2"></div>
                </div>
                <ul id="menu" className="menu">
                    <li>
                        <Link to="/home" className="nav-link-registro">
                            Inicio
                        </Link>
                    </li>
                    <li>
                        <Link to="/" className="nav-link-registro">
                            Cerrar Sesión
                        </Link>
                    </li>
                </ul>
            </nav>

            {/* Contenedor principal */}
            <div className="epp-container">
                <h1 className="epp-title">Buscar Trabajador y Entregas de EPP</h1>

                {/* Búsqueda por cédula */}
                <div className="epp-search">
                    <input
                        type="text"
                        id="epp-cedula"
                        className="epp-input"
                        placeholder="Ingrese la cédula"
                        value={cedula}
                        onChange={(e) => setCedula(e.target.value)}
                    />
                    <button id="epp-buscar" className="epp-button" onClick={handleBuscarTrabajador}>
                        Buscar
                    </button>
                </div>

                {/* Información del trabajador */}
                {trabajador && (
                    <div className="epp-datos">
                        <div className="epp-dato">
                            <strong>Nombre del trabajador:</strong>{" "}
                            <span>{trabajador.nombre} {trabajador.apellido}</span>
                        </div>
                        <div className="epp-dato">
                            <strong>Cédula:</strong> <span>{trabajador.cedula}</span>
                        </div>
                        <div className="epp-dato">
                            <strong>Centro de operación:</strong> <span>{trabajador.centro_de_operacion}</span>
                        </div>
                        <div className="epp-dato">
                            <strong>Cargo:</strong> <span>{trabajador.cargo}</span>
                        </div>
                        <div className="epp-dato">
                            <strong>Empresa:</strong> <span>{trabajador.empresa}</span>
                        </div>
                        <div className="epp-dato">
                            <strong>Contacto:</strong> <span>{trabajador.contacto}</span>
                        </div>
                    </div>
                )}

                {/* Lista de entregas */}
                {entregas.length > 0 && (
                    <div>
                        <button className="epp-button" onClick={handleDescargarPDF}>
                            Descargar PDF
                        </button>
                        <ul className="epp-lista-entregas">
                            {entregas.map((entrega, index) => {
                                const fechaValida = new Date(entrega.fecha_entrega);
                                const fechaFormateada = isNaN(fechaValida)
                                    ? "Fecha inválida"
                                    : format(fechaValida, "dd/MM/yyyy");

                                return (
                                    <li key={entrega._id} className="epp-item-entrega">
                                        <div className="epp-item-header">
                                            <strong>Entrega #{index + 1}</strong>
                                        </div>
                                        <div className="epp-item-details">
                                            <p><strong>Fecha:</strong> {fechaFormateada}</p>
                                            <p><strong>EPP Entregado:</strong> {entrega.epp_entregado}</p>
                                            <p><strong>Referencia/Tipo:</strong> {entrega.referencia_tipo}</p>
                                            <p><strong>Nombre Quien Entrega:</strong> {entrega.nombre_hs_entrega}</p>
                                            <p><strong>Tarea/Labor:</strong> {entrega.tarea_labor}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BuscarTrabajadorEPP;