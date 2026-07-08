// app/admin/products/categories.ts

export interface CategoryStructure {
    [key: string]: string[];
}

export const PRODUCT_CATEGORIES: CategoryStructure = {
    "Chambre à coucher": [
        "Armoires",
        "Commodes & coiffeuses",
        "Lits",
        "Tables de chevet"
    ],
    "Enfants & adolescents": [
        "Armoires enfants",
        "Chaises & tabourets enfants",
        "Lits enfants"
    ],
    "Salle à manger": [
        "Chaises",
        "Tables à manger"
    ],
    "Salon & séjour": [
        "Buffets & bahuts",
        "Canapés",
        "Étagères murales",
        "Tables basses"
    ]
};