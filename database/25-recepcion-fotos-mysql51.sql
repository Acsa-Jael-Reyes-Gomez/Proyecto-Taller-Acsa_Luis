CREATE TABLE IF NOT EXISTS recepcion_fotos (
    id_foto INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_recepcion INT NOT NULL,
    archivo VARCHAR(80) NOT NULL,
    imagen LONGBLOB NULL,
    nombre VARCHAR(255) NOT NULL,
    origen VARCHAR(15) NOT NULL,
    creado_por INT NOT NULL,
    fecha_creacion DATETIME NOT NULL,
    UNIQUE KEY uq_recepcion_foto_archivo (archivo),
    INDEX idx_recepcion_fotos (id_recepcion),
    CONSTRAINT fk_foto_recepcion FOREIGN KEY (id_recepcion)
        REFERENCES recepciones(id_recepcion) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
