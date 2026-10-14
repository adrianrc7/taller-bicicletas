import os
from enum import Enum
from typing import Optional, List
from fastapi import FastAPI, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

# Cargar variables de entorno
load_dotenv()

app = FastAPI(
    title="API Taller de Bicicletas",
    description="Sistema para gestionar órdenes de reparación con FastAPI y MongoDB Atlas",
    version="1.0.0"
)

# Permitir solicitudes CORS desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conexión a MongoDB Atlas
MONGODB_URI = os.getenv("MONGODB_URI")
print("URI actual utilizada por FastAPI:", MONGODB_URI)
client = MongoClient(MONGODB_URI)
db = client.get_database("taller_db")
ordenes_collection = db["ordenes"]


class EstadoReparacion(str, Enum):
    PENDIENTE = "Pendiente"
    EN_REPARACION = "En reparación"
    TERMINADA = "Terminada"



class OrdenCrear(BaseModel):
    codigo_cliente: str = Field(..., min_length=1, description="Código ficticio del cliente (ej. CLI-1001)")
    descripcion_bici: str = Field(..., min_length=1, description="Marca, modelo o color de la bicicleta")
    problema: str = Field(..., min_length=1, description="Problema reportado o mantenimiento necesario")
    estado: EstadoReparacion = Field(default=EstadoReparacion.PENDIENTE, description="Estado inicial de la reparación")


class OrdenActualizarEstado(BaseModel):
    estado: EstadoReparacion = Field(..., description="Nuevo estado de la reparación")


class OrdenRespuesta(OrdenCrear):
    id: str = Field(..., description="Identificador único generado por MongoDB")


# Endpoints de la API

# 1) Crear una nueva orden de reparación
@app.post("/api/ordenes", response_model=OrdenRespuesta, status_code=status.HTTP_201_CREATED)
def crear_orden(orden: OrdenCrear):
    doc = orden.model_dump()
    resultado = ordenes_collection.insert_one(doc)
    
    return OrdenRespuesta(
        id=str(resultado.inserted_id),
        **doc
    )



# 2) Consultar todas las órdenes (con filtros separados)
@app.get("/api/ordenes", response_model=List[OrdenRespuesta])
def obtener_ordenes(
    estado: Optional[EstadoReparacion] = Query(None, description="Filtrar por estado"),
    codigo_cliente: Optional[str] = Query(None, description="Filtrar por código exacto de cliente"),
    bici: Optional[str] = Query(None, description="Búsqueda por modelo/descripción de bicicleta"),
    problema: Optional[str] = Query(None, description="Búsqueda por problema o avería")
):
    query = {}

    # Filtro 1: Estado exacto
    if estado:
        query["estado"] = estado.value

    # Filtro 2: Código de cliente exacto
    if codigo_cliente:
        query["codigo_cliente"] = codigo_cliente

    # Filtro 3: Búsqueda flexible en bicicleta
    if bici:
        query["descripcion_bici"] = {"$regex": bici, "$options": "i"}

    # Filtro 4: Búsqueda flexible en problema
    if problema:
        query["problema"] = {"$regex": problema, "$options": "i"}

    documentos = ordenes_collection.find(query)

    lista_ordenes = []
    for doc in documentos:
        lista_ordenes.append(OrdenRespuesta(
            id=str(doc["_id"]),
            codigo_cliente=doc["codigo_cliente"],
            descripcion_bici=doc["descripcion_bici"],
            problema=doc["problema"],
            estado=doc["estado"]
        ))

    return lista_ordenes


# 3) Cambiar el estado de una orden
@app.patch("/api/ordenes/{id_orden}/estado")
def cambiar_estado(id_orden: str, datos: OrdenActualizarEstado):
    if not ObjectId.is_valid(id_orden):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El ID de orden proporcionado no tiene un formato válido de MongoDB"
        )

    resultado = ordenes_collection.update_one(
        {"_id": ObjectId(id_orden)},
        {"$set": {"estado": datos.estado.value}}
    )

    if resultado.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró ninguna orden con el ID especificado"
        )

    return {
        "mensaje": "Estado actualizado correctamente",
        "id": id_orden,
        "nuevo_estado": datos.estado.value
    }